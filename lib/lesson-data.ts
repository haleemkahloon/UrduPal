import type { LessonDefinition } from "./types";

export const LESSONS: Record<string, LessonDefinition> = {
  "1-1": {
    title: "Unit 1 · Greetings · Lesson 1",
    screens: [
      {
        type: "intro",
        urdu: "آپ کا نام کیا ہے؟",
        roman: "Aap ka naam kya hai?",
        eng: "What is your name?",
        tip: 'Urdu is verb-final: "Your name what is?" — the verb always comes last.',
      },
      {
        type: "listen-choose",
        prompt: "What does this mean?",
        roman: "Aap ka naam kya hai?",
        choices: [
          "How are you?",
          "Where are you from?",
          "What is your name?",
          "How old are you?",
        ],
        correct: 2,
        feedback: '"Aap ka naam kya hai?" — you got it.',
      },
      {
        type: "word-bank",
        prompt: 'Arrange the words: "My name is Haleem"',
        tip: "Mera naam (My name) + Haleem + hai (is). Verb goes last!",
        tiles: ["Mera", "naam", "Haleem", "hai", "kya", "aap"],
        answer: ["Mera", "naam", "Haleem", "hai"],
      },
      {
        type: "speak",
        roman: "Mera naam Haleem hai.",
        eng: "My name is Haleem.",
      },
      {
        type: "intro-pair",
        pairs: [
          {
            roman: "As-salamu Alaykum",
            eng: "Peace be upon you",
            note: "formal greeting",
          },
          {
            roman: "Wa Alaykum Assalam",
            eng: "And upon you peace",
            note: "the reply",
          },
        ],
        tip: "Use this greeting with everyone — it shows respect immediately.",
      },
      {
        type: "dialogue",
        speaker: "Ahmed",
        line_roman: "As-salamu Alaykum! Aap ka naam kya hai?",
        line_urdu: "السلام علیکم! آپ کا نام کیا ہے؟",
        line_eng: "Peace be upon you! What is your name?",
        choices: [
          "Kya haal hai? (How are you?)",
          "Wa Alaykum Assalam! Mera naam Haleem hai.",
          "Main theek hun. (I am fine.)",
        ],
        correct: 1,
        reply_roman: "Bahut khushi hui, Haleem sahib!",
        reply_urdu: "بہت خوشی ہوئی، حلیم صاحب!",
        reply_eng: "Very pleased to meet you, Mr Haleem!",
        tip: '"Sahib" = Mr / honorific. Native speakers will be impressed when you use it.',
      },
      {
        type: "translate",
        prompt: '"Very pleased to meet you"',
        choices: [
          "Aap kahan hain?",
          "Bahut khushi hui",
          "Main theek hun",
          "Shukriya",
        ],
        correct: 1,
        feedback: '"Bahut" = very, "khushi" = happiness, "hui" = happened.',
      },
    ],
    words: [
      { roman: "Aap ka naam kya hai?", eng: "What is your name?" },
      { roman: "Mera naam … hai", eng: "My name is …" },
      { roman: "As-salamu Alaykum", eng: "Peace greeting" },
      { roman: "Bahut khushi hui", eng: "Pleased to meet you" },
      { roman: "Sahib / Ji", eng: "Mr / respectful" },
      { roman: "Shukriya", eng: "Thank you" },
    ],
    culture:
      'Add "Ji" after someone\'s name (like "Haleem Ji") to show respect. Native speakers notice and appreciate this immediately.',
  },
};
