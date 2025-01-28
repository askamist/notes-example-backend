import { GoogleGenerativeAI } from "@google/generative-ai";
import { PrismaClient } from "@prisma/client";
import { generateRandomColor } from "./colors.js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const prisma = new PrismaClient();

export async function analyzeAndTagNote(noteId: string) {
  const note = await prisma.note.findUnique({
    where: { id: noteId },
  });

  if (!note) {
    throw new Error("Note not found");
  }

  // Delete existing tags associations
  await prisma.notesOnTags.deleteMany({
    where: { noteId: note.id },
  });

  // Use Gemini to analyze content
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
  const prompt = `Analyze this text and suggest up to 5 relevant tags. Return only a JSON array of strings.

  Title: ${note.title}
  Content: ${note.content}`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const suggestedTags = JSON.parse(response.text());

  // Create or get existing tags and associate them with the note
  const tagPromises = suggestedTags.map(async (tagName: string) => {
    const tag = await prisma.tag.upsert({
      where: { name: tagName.toLowerCase() },
      create: {
        name: tagName.toLowerCase(),
        color: generateRandomColor(),
      },
      update: {},
    });

    await prisma.notesOnTags.create({
      data: {
        noteId: note.id,
        tagId: tag.id,
      },
    });

    return tag;
  });

  return Promise.all(tagPromises);
}
