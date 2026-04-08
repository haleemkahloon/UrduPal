import type { User } from "@supabase/supabase-js";

export type UserProgress = {
  xp: number;
  streak: number;
  lessons_done: number;
  completed: Record<string, boolean>;
  lastDate?: string;
};

export type LessonScreen =
  | {
      type: "intro";
      urdu: string;
      roman: string;
      eng: string;
      tip: string;
    }
  | {
      type: "listen-choose" | "translate";
      prompt: string;
      roman?: string;
      choices: string[];
      correct: number;
      feedback?: string;
    }
  | {
      type: "word-bank";
      prompt: string;
      tip: string;
      tiles: string[];
      answer: string[];
    }
  | {
      type: "speak";
      roman: string;
      eng: string;
    }
  | {
      type: "intro-pair";
      pairs: { roman: string; eng: string; note: string }[];
      tip: string;
    }
  | {
      type: "dialogue";
      speaker: string;
      line_roman: string;
      line_urdu: string;
      line_eng: string;
      choices: string[];
      correct: number;
      reply_roman: string;
      reply_urdu: string;
      reply_eng: string;
      tip: string;
    };

export type LessonDefinition = {
  title: string;
  screens: LessonScreen[];
  words: { roman: string; eng: string }[];
  culture: string;
};

export type LessonRuntimeState = {
  key: string;
  data: LessonDefinition;
  screen: number;
  xp: number;
  hearts: number;
  correct: number;
  total: number;
  wbPlaced: string[];
  wbAnswer: string[];
  micState: number;
  audioTimers: Record<string, ReturnType<typeof setTimeout>>;
};

export type { User };
