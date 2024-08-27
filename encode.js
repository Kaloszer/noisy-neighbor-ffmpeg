import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync, readdirSync } from 'fs';
import path from 'path';
import { parseArgs } from 'util';
import { randomUUID } from 'crypto';

const inputDir = './input_videos';
const outputDir = './output_clips';
const finalOutput = 'compilation.mp4';

const execAsync = promisify(exec);

const { values } = parseArgs({
  options: {
    timestamp: { type: 'boolean' },
    threshold: { type: 'string' },
    bufferTime: { type: 'string' },
    googlephotosdate: { type: 'boolean' }  // New flag
  }
});

const addTimestamp = values.timestamp || false;
const threshold = values.threshold || '-60dB';
const bufferTime = parseFloat(values.bufferTime) || 4;
const useGooglePhotosDate = values.googlephotosdate || false;  // New variable

function getDateFromFilename(filename) {
  if (useGooglePhotosDate) {
    const match = filename.match(/^VID_(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})/);
    if (match) {
      const [, year, month, day, hour, minute] = match;
      return `${year}-${month}-${day} ${hour}:${minute}`;
    }
  } else {
    const match = filename.match(/^(\d{4}-\d{2}-\d{2}-\d{2}-\d{2})/);
    if (match) {
      const [year, month, day, hour, minute] = match[1].split('-');
      return `${year}-${month}-${day} ${hour}:${minute}`;
    }
  }
  return 'Unknown Date';
}

async function checkEnvironment() {
  console.log("Checking environment...");
  const fontPath = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
  if (!existsSync(fontPath)) {
    console.error(`Font file not found at ${fontPath}. Please update the fontPath variable with a valid font file path.`);
    process.exit(1);
  }
  console.log("Environment check completed successfully.");
}

async function getVideoDuration(inputPath) {
  try {
    const { stdout } = await execAsync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${inputPath}"`);
    const duration = parseFloat(stdout.trim());
    if (isNaN(duration)) {
      throw new Error('Failed to parse video duration');
    }
    return duration;
  } catch (error) {
    console.error('Error getting video duration:', error);
    return null;
  }
}

async function cleanupOutputDir() {
  console.log("Cleaning up output directory...");
  const files = readdirSync(outputDir);
  for (const file of files) {
    unlinkSync(path.join(outputDir, file));
  }
  
  // Remove compilation.mp4 if it exists
  const compilationPath = path.join(process.cwd(), finalOutput);
  if (existsSync(compilationPath)) {
    unlinkSync(compilationPath);
    console.log(`Removed ${finalOutput}`);
  }
  
  console.log("Cleanup completed.");
}

async function detectSilence(inputPath, outputPath) {
  try {
    console.log(`Detecting silence in ${inputPath} with threshold ${threshold}`);
    await execAsync(`ffmpeg -i "${inputPath}" -af silencedetect=noise=${threshold}:d=0.5 -f null - 2> "${outputPath}"`);
    console.log(`Silence detection completed for ${inputPath}`);
    const output = readFileSync(outputPath, 'utf8');
    console.log("Silence detection output:", output);
    return true;
  } catch (error) {
    console.error(`Error detecting silence in ${inputPath}:`, error);
    return false;
  }
}

async function processVideos() {
  await cleanupOutputDir();

  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const videoFiles = readdirSync(inputDir).filter(file => 
    ['.mp4', '.avi', '.mov'].includes(path.extname(file).toLowerCase())
  );

  const allClips = [];

  for (const file of videoFiles) {
    const inputPath = path.join(inputDir, file);
    const outputPath = path.join(outputDir, `output_${randomUUID()}.txt`);

    console.log(`Processing ${file}...`);

    const videoDuration = await getVideoDuration(inputPath);
    if (videoDuration === null) continue;

    console.log(`Video duration: ${videoDuration} seconds`);

    if (!await detectSilence(inputPath, outputPath)) continue;

    if (!existsSync(outputPath)) {
      console.error(`Output file not created: ${outputPath}`);
      continue;
    }

    console.log(`Analyzing silence segments for ${file}...`);
    const output = readFileSync(outputPath, 'utf8');
    const silenceSegments = [];
    let silenceStart = null;

    output.split('\n').forEach(line => {
      if (line.includes('silence_start')) {
        silenceStart = parseFloat(line.split('silence_start:')[1]);
      } else if (line.includes('silence_end')) {
        const silenceEnd = parseFloat(line.split('silence_end:')[1]);
        if (silenceStart !== null) {
          silenceSegments.push({ start: silenceStart, end: silenceEnd });
        }
        silenceStart = null;
      }
    });

    console.log(`Found ${silenceSegments.length} silence segments in ${file}`);
    console.log('Silence segments:', JSON.stringify(silenceSegments, null, 2));

    const nonSilenceSegments = [];
    let lastEnd = 0;

    for (const silence of silenceSegments) {
      if (silence.start > lastEnd) {
        nonSilenceSegments.push({ start: lastEnd, end: silence.start });
      }
      lastEnd = silence.end;
    }

    if (lastEnd < videoDuration) {
      nonSilenceSegments.push({ start: lastEnd, end: videoDuration });
    }

    console.log(`Calculated ${nonSilenceSegments.length} non-silence segments in ${file}`);
    console.log('Non-silence segments:', JSON.stringify(nonSilenceSegments, null, 2));

    const mergedSegments = [];
    let currentSegment = nonSilenceSegments[0];

    for (let i = 1; i < nonSilenceSegments.length; i++) {
      const nextSegment = nonSilenceSegments[i];
      if (nextSegment.start - currentSegment.end < 3) {  // Merge segments less than 3 seconds apart
        currentSegment.end = nextSegment.end;
      } else {
        mergedSegments.push(currentSegment);
        currentSegment = nextSegment;
      }
    }
    mergedSegments.push(currentSegment);

    console.log(`Merged into ${mergedSegments.length} segments`);
    console.log('Merged segments:', JSON.stringify(mergedSegments, null, 2));

    const fileDate = getDateFromFilename(file);

    for (let i = 0; i < mergedSegments.length; i++) {
      const segment = mergedSegments[i];
      const clipOutput = path.join(outputDir, `clip_${file}_${i.toString().padStart(3, '0')}_${segment.start.toFixed(2)}-${segment.end.toFixed(2)}.mp4`);
      
      const startTime = Math.max(segment.start - bufferTime, 0);
      const endTime = Math.min(segment.end + bufferTime, videoDuration);
      const duration = endTime - startTime;

      // Skip segments that are too short
      if (duration < 1) {
        console.log(`Skipping segment ${i + 1} due to short duration: ${duration.toFixed(2)}s`);
        continue;
      }

      console.log(`Extracting segment ${i + 1}/${mergedSegments.length} from ${file}: ${startTime.toFixed(2)}s to ${endTime.toFixed(2)}s (duration: ${duration.toFixed(2)}s)`);

      let ffmpegCommand = `ffmpeg -i "${inputPath}" -ss ${startTime} -t ${duration}`;

      if (addTimestamp) {
        const clipTimeRange = `${formatTime(startTime)}-${formatTime(endTime)}`;
        const escapedText = `${fileDate} | ${clipTimeRange}`.replace(/:/g, '\\:').replace(/'/g, "\\'");
        const drawTextFilter = `drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:fontsize=16:fontcolor=white:box=1:boxcolor=black@0.5:boxborderw=5:x=(w-tw)/2:y=h-th-10:text='${escapedText}'`;
        ffmpegCommand += ` -vf "${drawTextFilter}"`;
      }

      ffmpegCommand += ` -c:a copy "${clipOutput}"`;
      
      try {
        console.log(`Executing ffmpeg command: ${ffmpegCommand}`);
        await execAsync(ffmpegCommand);
        console.log(`Successfully extracted segment ${i + 1} from ${file}`);
        allClips.push(clipOutput);
      } catch (error) {
        console.error(`Error extracting segment ${i + 1} from ${file}:`, error);
        console.error(`Failed ffmpeg command: ${ffmpegCommand}`);
      }
    }

    unlinkSync(outputPath);
    console.log(`Finished processing ${file}`);
  }

  // After processing all videos
  console.log(`Total clips extracted: ${allClips.length}`);

  if (allClips.length === 0) {
    console.error('No clips were extracted. Cannot create compilation.');
    return;
  }

  // Sort all clips based on their filenames (which now include the original start time)
  allClips.sort((a, b) => {
    const aMatch = a.match(/(\d+\.\d+)-/);
    const bMatch = b.match(/(\d+\.\d+)-/);
    if (!aMatch || !bMatch) {
      console.error('Error parsing clip filename:', !aMatch ? a : b);
      return 0;
    }
    return parseFloat(aMatch[1]) - parseFloat(bMatch[1]);
  });

  // Create a new clip list file with the sorted clips
  const clipList = path.join(outputDir, 'clip_list.txt');
  const clipListContent = allClips.map(file => `file '${path.basename(file)}'`).join('\n');
  writeFileSync(clipList, clipListContent);

  console.log('Clip list content:');
  console.log(clipListContent);

  // Combine the sorted clips
  try {
    await execAsync(`ffmpeg -f concat -safe 0 -i "${clipList}" -c copy "${finalOutput}"`);
    console.log(`Compilation complete. Output file: ${finalOutput}`);
  } catch (error) {
    console.error('Error combining clips:', error);
    console.error('Clip list content:', clipListContent);
  }

  // Clean up individual clip files
  allClips.forEach(file => unlinkSync(file));
  unlinkSync(clipList);
}

// Helper function to format time
function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

async function main() {
  await checkEnvironment();
  await processVideos();
}

main().catch(console.error);