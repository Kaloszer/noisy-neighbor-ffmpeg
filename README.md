# 🔊 Noisy Neighbor Compiler

## Because sometimes, peace and quiet is just a script away! 🏠👨‍⚖️

Are your neighbors treating your walls like they're made of rubber? Is their idea of a lullaby a impromptu heavy metal concert at 3 AM? Fear not, weary apartment dweller! The Noisy Neighbor Compiler is here to turn those sleepless nights into concrete evidence.

## What's This All About?

This project is your ally in the ongoing struggle for peace and quiet. It takes your collection of "Noisy Neighbor's Greatest Hits" videos and compiles them into one comprehensive video – perfect for when you need to prove that your upstairs neighbor is actually running a 24/7 indoor trampoline park.

### Key Features:

- 🎬 Compiles multiple video clips into one comprehensive "noisy neighbor highlight reel"
- 🔊 Customizable noise threshold detection
- ⏱️ Optional timestamp overlay (for when you need to prove that yes, they were indeed having a rave at 4:27 AM on a Tuesday)
- 🧠 Smart silence detection (it knows the difference between "peaceful quiet" and "the calm before the storm")

## How It Works

1. Place your evidence ("video clips") into the `input_videos` folder.
2. Run the script - it detects the noisiest parts of each video.
3. Sit back as it stitches together a compilation that would make any landlord take notice.
4. Use the resulting video to file your complaint, support your case, or simply as a modern art piece titled "Nocturnal Symphonies: A Study in Neighborly Disharmony".

## Getting Started

1. Clone this repo (as quietly as your neighbors are not).
2. Install the dependencies (you'll need ffmpeg and Bun).
3. Place your video files in the `input_videos` directory.
4. Run the script:
   ```
   bun run encode.js
   ```
5. For those who like their evidence timestamped:
   ```
   bun run encode.js --timestamp
   ```

## A Note on File Naming

To use the timestamp feature, name your input files like this:
```
YYYY-MM-DD-HH-MM-your-creative-file-name-here.mp4
```
Example: `2024-03-15-22-30-upstairs-neighbor-flamenco-practice.mp4`

## Disclaimer

This tool is for legal and ethical use only. We're not responsible for any improper use, neighborly disputes, or sudden urges to become a hermit in a soundproof bunker. Remember, the goal is peaceful coexistence, not an appearance on "World's Wildest Neighbor Wars".

## Contributing

Found a way to make this even more effective in the quest for tranquility? Pull requests are welcome! Just keep it down while you're coding, will ya?

## License

Psst... it's MIT licensed! But we like to call it the "I Just Want Some Peace and Quiet" License. Use it wisely, and may the power of reasonable noise levels be with you.

---

Remember, in the game of noisy neighbors, when you play the long game, everybody wins. Except maybe the guy with the wall-shaking sound system. He might need to tone it down a bit. But that's kind of the point, isn't it? 😉

Now go forth and reclaim your right to a good night's sleep!