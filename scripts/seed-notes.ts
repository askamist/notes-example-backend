import { PrismaClient } from "@prisma/client";
import { generateRandomColor } from "../src/utils/colors.js";

const prisma = new PrismaClient();

const sampleNotes = [
  {
    title: "Screenplay Idea - Modern Mahabharata",
    content: `<h2>Setting: Contemporary Mumbai</h2>
<h3>Key Characters:</h3>
<ul>
  <li>Arjun: Tech startup founder</li>
  <li>Krishna: Mysterious mentor/VC investor</li>
  <li>Duryodhana: Corporate rival</li>
</ul>

<h3>Theme:</h3>
<p>Exploring dharma in the age of startups and social media. Family legacy vs innovation.</p>

<h3>Visual style:</h3>
<p>Neon-noir meets traditional Indian aesthetics</p>

<h3>Music:</h3>
<p>Fusion of classical ragas with electronic beats</p>

<p><strong>Need to discuss with AR Rahman for soundtrack possibilities.</strong></p>

<h3>Potential shooting locations:</h3>
<ul>
  <li>BKC for corporate scenes</li>
  <li>Dharavi for contrast</li>
  <li>Marine Drive for key philosophical discussions</li>
</ul>`,
    tags: ["screenplay", "epic", "modern-adaptation", "mumbai", "drama"],
  },
  {
    title: "Documentary Research - Folk Artists of Rajasthan",
    content: `<h3>Interviews scheduled:</h3>
<ol>
  <li>Manganiyar family in Jaisalmer</li>
  <li>Kalbeliya dancers near Jodhpur</li>
  <li>Kathputli artists in Jaipur</li>
</ol>

<h3>Equipment needed:</h3>
<ul>
  <li>Red camera for main shoots</li>
  <li>Drone for desert landscapes</li>
  <li>Portable audio setup for folk music recording</li>
</ul>

<h3>Questions to explore:</h3>
<ul>
  <li>Impact of tourism on traditional art forms</li>
  <li>Generation gap in artist families</li>
  <li>Modern fusion experiments</li>
</ul>

<p><strong>Contact Amit for location permits in heritage sites.</strong></p>
<p>Budget estimate: <strong>1.2 CR</strong></p>
<p>Timeline: <em>3 months during winter</em></p>`,
    tags: ["documentary", "folk-art", "rajasthan", "music", "culture"],
  },
  {
    title: "VFX Meeting Notes - Sci-Fi Project",
    content: `<h2>Meeting with DNEG team:</h2>

<h3>Requirements for space sequence:</h3>
<ul>
  <li>Zero gravity choreography reference from Gravity</li>
  <li>Need better particle effects for nebula scenes</li>
  <li>Discuss motion capture setup for alien creatures</li>
</ul>

<h3>Technical specs:</h3>
<ul>
  <li>IMAX format</li>
  <li>4K minimum resolution</li>
  <li>HDR color grading</li>
</ul>

<h3>Budget concerns:</h3>
<ul>
  <li>Might need to reduce number of space sequences</li>
  <li>Prioritize character close-ups</li>
  <li>Explore hybrid practical + CGI solutions</li>
</ul>

<p><strong>Next review: Tuesday with concept art team</strong></p>`,
    tags: ["vfx", "sci-fi", "production", "technical", "budget"],
  },
  {
    title: "Cast Workshop Ideas - Method Acting",
    content: `<h2>Week-long workshop plan:</h2>
<ul>
  <li><strong>Day 1:</strong> Character background development</li>
  <li><strong>Day 2:</strong> Dialect coaching (Bhojpuri accent)</li>
  <li><strong>Day 3:</strong> Physical transformation exercises</li>
  <li><strong>Day 4:</strong> Scene improvisation</li>
  <li><strong>Day 5:</strong> Camera test with different lighting</li>
</ul>

<h3>Exercises:</h3>
<ul>
  <li>Living as character for 24 hours</li>
  <li>Street performance in character</li>
  <li>Family background creation</li>
</ul>

<h3>Reading material:</h3>
<ul>
  <li>Stanislavski's books</li>
  <li>Naseeruddin Shah's memoir</li>
  <li>Local newspaper archives from 1990s</li>
</ul>

<p><em>Location: Madh Island villa</em></p>`,
    tags: ["acting", "workshop", "preparation", "training", "direction"],
  },
  {
    title: "Music Composition Notes - Period Film",
    content: `<h3>Instruments needed:</h3>
<ul>
  <li>Sarangi</li>
  <li>Rudra Veena</li>
  <li>Classical percussion ensemble</li>
  <li>Symphony orchestra</li>
</ul>

<h3>Themes to develop:</h3>
<ol>
  <li><strong>Main character theme</strong> (Raga Bhairavi based)</li>
  <li><strong>Love theme</strong> (Raga Yaman fusion)</li>
  <li><strong>Conflict theme</strong> (Percussion heavy)</li>
</ol>

<h3>Reference tracks:</h3>
<ul>
  <li>Lagaan background score</li>
  <li>Game of Thrones theme structure</li>
  <li>Traditional Dhrupad recordings</li>
</ul>

<h3>Recording schedule:</h3>
<ul>
  <li>Mumbai - Classical instruments</li>
  <li>London - Orchestra</li>
  <li>Chennai - Percussion ensemble</li>
</ul>

<p><em>Discuss with sound team about Dolby Atmos mix</em></p>`,
    tags: ["music", "period-film", "composition", "classical", "soundtrack"],
  },
];

async function seedNotes(userId: string) {
  try {
    console.log("Starting to seed notes...");

    for (const note of sampleNotes) {
      // Create the note
      const createdNote = await prisma.note.create({
        data: {
          title: note.title,
          content: note.content,
          userId: userId,
        },
      });

      // Create and link tags
      for (const tagName of note.tags) {
        const tag = await prisma.tag.upsert({
          where: { name: tagName },
          create: {
            name: tagName,
            color: generateRandomColor(),
          },
          update: {},
        });

        await prisma.notesOnTags.create({
          data: {
            noteId: createdNote.id,
            tagId: tag.id,
          },
        });
      }

      console.log(`Created note: ${note.title}`);
    }

    console.log("Seeding completed successfully!");
  } catch (error) {
    console.error("Error seeding notes:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Get userId from command line argument
const userId = process.argv[2];

if (!userId) {
  console.error("Please provide a userId as a command line argument");
  process.exit(1);
}

seedNotes(userId);
