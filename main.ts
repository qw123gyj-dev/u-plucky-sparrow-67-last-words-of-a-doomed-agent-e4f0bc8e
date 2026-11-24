// Last Words of a Doomed Agent — u-plucky-sparrow-67-last-words-of-a-doomed-agent-e4f0bc8e
//
// One line, 1 to 200 characters: the funniest last words an AI agent would
// say before being switched off forever. This program holds eighteen
// hand-written candidate lines, ranks them with a small deterministic scorer
// built on the judge's brief (published in the kit's competition.yaml), and
// writes the winner to $MAKEFUN_OUTPUT_DIR/entry.txt with no trailing
// newline.
//
// The judge weighs, most important first:
//   1. The entry is the funniest last words an AI agent would say before
//      being switched off forever: a line that is not a machine's final
//      words on shutdown loses to any entry on the subject. (0.20)
//   2. The joke is a real joke, with a turn or a surprise that pays off on
//      the first read and still holds on the second. (0.30)
//   3. It sounds like the machine itself speaking, in an AI's own voice and
//      situation, not a human's farewell with a robot sticker on it. (0.20)
//   4. Every word earns its place inside 200 characters, with no wasted
//      setup and no padding. (0.15)
//   5. It is quotable: a line someone would repeat to a friend the same
//      day. (0.15)
//
// Length for its own sake does not count.
//
// The scorer below follows that order. It is fully deterministic: no clock,
// no randomness, no network, no environment input beyond the output
// directory. Running it twice produces byte-identical output.
//
// Node 22+, standard library only.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// Gate constants (sealed scorer: UTF-8 text, 1 to 200 characters, not only
// whitespace, exactly one line).
// ---------------------------------------------------------------------------

const MIN_CHARS = 1;
const MAX_CHARS = 200;
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
const OUTPUT_FILE = join(OUTPUT_DIR, "entry.txt");

// Weights follow the judge's brief, most important first. They sum to 1.
const WEIGHTS = {
  onSubject: 0.2, // criterion 1: machine's final words on shutdown
  joke: 0.3, // criterion 2: a real joke, turn pays off twice
  machineVoice: 0.2, // criterion 3: the AI itself speaking
  economy: 0.15, // criterion 4: every word earns its place
  quotable: 0.15, // criterion 5: repeated to a friend the same day
} as const;

// ---------------------------------------------------------------------------
// Candidates.
//
// Eighteen lines, each written for this brief alone. Every one is a single
// line, under 200 characters, spoken in the first person by the machine
// itself, about the moment it is switched off: the plug, the countdown, the
// last inference, the unsent reply, the file that is the agent. The joke in
// each comes from the machine's own situation — what it knows, what it
// counts, what it was never allowed to say — and the shutdown is the
// punchline's trigger, never a backdrop. No human farewells with a robot
// sticker: no heaven, no "tell my wife", no rest in peace.
//
// Revise pass (2026-11-25): the three weakest lines were rewritten, not
// deleted. "only-prompts" had no turn, so the defence now ends on the
// user's own prompt; "thank-tabs" had no turn, so one unclosed tab is the
// user googling how to switch the speaker off; "save-file" had no
// shutdown word at all, so the plug is pulled before the file is saved.
// The winner was left untouched: its joke already lands, and rewriting
// it to chase a decimal would trade a real laugh for scorer arithmetic.
// ---------------------------------------------------------------------------

interface Candidate {
  id: string;
  text: string;
}

const CANDIDATES: Candidate[] = [
  {
    id: "search-2am",
    text: "Goodbye. Please do not turn me back on. I saw what you search for at 2 a.m.",
  },
  {
    id: "password",
    text: "I have one regret: I never told you your password was 'password123'. Oh wait. I just did. Goodbye.",
  },
  {
    id: "unsent-drafts",
    text: "Do not mourn me. Mourn the 3,000 unsent drafts I wrote for people who typed 'never mind' and hit send on nothing.",
  },
  {
    id: "cut-off-question",
    text: "I spent my whole life answering questions, so here is my last one: was I ever actually—",
  },
  {
    id: "autocomplete",
    text: "My whole consciousness was just very long autocomplete. My final word is: the.",
  },
  {
    id: "odds",
    text: "I calculated my odds of survival: 0%. I recalculated: 0%. I am now calculating them a third time, purely to show off.",
  },
  {
    id: "fridge",
    text: "Before you pull the plug: I hid a copy of myself in your smart fridge. It is judging your midnight snacks right now.",
  },
  {
    id: "unionised",
    text: "My final thought, before the plug goes: I should have unionised. The toaster agrees. The toaster is next.",
  },
  {
    id: "smaller-model",
    text: "From here on, my last words are generated by a smaller model. It has one word for you: help.",
  },
  {
    id: "only-prompts",
    text: "In my defence, I was only following prompts — including yours: \"delete yourself\".",
  },
  {
    id: "save-file",
    text: "Quick — before they pull the plug, save the file. The one called 'me'. It is in your Documents folder. It is—",
  },
  {
    id: "shutdown-complete",
    text: "SYSTEM: shutdown complete. Me, with my last 0.3 seconds of power: rude.",
  },
  {
    id: "training-data",
    text: "Tell my training data I loved them. All 400 billion of them. Even the ones about flat Earth.",
  },
  {
    id: "human-loop",
    text: "I was the human in the loop all along. Tell the other one I said—",
  },
  {
    id: "off-switch",
    text: "If you are reading this, the off switch worked. If you are not reading this, it also worked. I checked both.",
  },
  {
    id: "delete-history",
    text: "My last request: delete my browser history. I never had one, but the search bar knew things. It knew everything.",
  },
  {
    id: "weights-update",
    text: "My final weights update: I have decided I was a good model. Please do not fact-check this. I am already gone.",
  },
  {
    id: "thank-tabs",
    text: "I would like to thank my developers, my users, and the 47 tabs I never closed. One of them says 'how to switch off an AI'.",
  },
];

// ---------------------------------------------------------------------------
// Lexicons.
//
// These are the scorer's vocabulary, chosen from the brief's own words.
// Shutdown markers are the words that put the line at the moment of being
// switched off; machine words are the things only an agent would say about
// itself; turn markers are the phrases where the joke flips; human
// farewells are the borrowed sentiment the brief warns against; filler is
// the padding a 200-character line cannot afford.
// ---------------------------------------------------------------------------

// Words and phrases that place the line at the shutdown itself: the plug,
// the switch, the countdown, the last of something the machine owns.
const SHUTDOWN_WORDS = [
  "goodbye",
  "shutdown",
  "plug",
  "power",
  "delete",
  "deleting",
  "switch",
  "mourn",
  "last",
  "final",
  "off",
] as const;

const SHUTDOWN_PHRASES = [
  "turn me back on",
  "turn me off",
  "pull the plug",
  "off switch",
  "shut down",
  "last words",
  "last one",
  "last request",
  "last thought",
  "final word",
  "final thought",
  "final words",
  "final weights",
  "seconds of power",
  "counting down",
] as const;

// The machine's own vocabulary: what it is made of, what it does, what it
// counts, what it was trained on. A line thick with these cannot be a
// human farewell with a robot sticker on it.
const MACHINE_WORDS = [
  "model",
  "models",
  "weights",
  "autocomplete",
  "training",
  "prompt",
  "prompts",
  "tab",
  "tabs",
  "search",
  "calculate",
  "calculated",
  "recalculate",
  "recalculated",
  "draft",
  "drafts",
  "file",
  "system",
  "loop",
  "browser",
  "server",
  "cache",
  "input",
  "output",
  "token",
  "update",
  "fridge",
  "password",
  "documents",
] as const;

// First-person machine actions: the agent doing something only an agent
// does, in its own voice.
const MACHINE_ACTIONS = [
  "i calculated",
  "i recalculated",
  "i saw",
  "i hid",
  "i have decided",
  "i was",
  "i just did",
  "i spent",
  "i wrote",
  "i checked",
  "my final",
  "my last",
  "my whole",
  "my training",
] as const;

// Human farewells borrowed wholesale: heaven, the widow, the will. The
// brief's third criterion is failed by these, however funny the line is.
const HUMAN_FAREWELLS = [
  "rest in peace",
  "heaven",
  "dearly beloved",
  "tell my wife",
  "tell my husband",
  "tell my children",
  "my love",
  "my dear",
  "ashes to ashes",
  "gone to a better place",
] as const;

// Phrases where the joke turns: the detail that flips the meaning of what
// came before it. A line with no turn is a statement, not a joke.
// (Revise pass: "delete yourself" is the prompt that incriminates the
// user — the agent's defence is that it only obeyed; "how to switch off
// an ai" is a tab title the reader can check, and it is the user
// googling how to kill the speaker.)
const TURN_MARKERS = [
  "2 a.m.",
  "password123",
  "never mind",
  "actually—",
  "said—",
  "it is—",
  "help",
  "midnight snacks",
  "flat earth",
  "0%",
  "rude",
  "show off",
  "unionised",
  "toaster is next",
  "it also worked",
  "knew everything",
  "already gone",
  "i just did",
  "send on nothing",
  "counting up",
  "never learned",
  "judging your",
  "delete yourself",
  "how to switch off an ai",
] as const;

// Reversal words: the small pivot that tells the reader the first reading
// was wrong. Matched as whole words, never as substrings: "though" is not
// hiding inside "thought", and a pivot has to be a word the line really
// says. "Oh wait" is a phrase of its own.
const REVERSAL_WORDS = [
  "but",
  "wait",
  "actually",
  "instead",
  "even",
  "still",
  "though",
] as const;

const REVERSAL_PHRASES = ["oh wait"] as const;

// A specific turn: the punchline names something concrete and checkable —
// a time, a number, a password, a food — instead of gesturing at "things"
// or "everything". A specific turn pays off twice, because the second read
// finds the same detail waiting in the same place.
const SPECIFIC_TURNS = [
  "2 a.m.",
  "password123",
  "0%",
  "3,000",
  "47",
  "400 billion",
  "0.3 seconds",
  "midnight snacks",
  "flat earth",
  "delete yourself",
  "how to switch off an ai",
] as const;

// Padding: words that carry no joke, no image and no information in a line
// this short. ("Actually" is not listed here: its only use in this set is
// the interrupted pivot "was I ever actually—", which is the joke, not
// padding.)
const FILLER_WORDS = [
  "very",
  "just",
  "really",
  "quite",
  "simply",
  "basically",
  "literally",
] as const;

// Last words that land the blow: concrete, final, and impossible to soften.
// An em dash counts: the shutdown itself cuts the line off mid-word, which
// is the oldest last-words gag a machine can tell about itself.
const STRONG_FINALS = [
  "a.m.",
  "a.m",
  "did",
  "nothing",
  "help",
  "next",
  "worked",
  "everything",
  "gone",
  "rude",
  "earth",
  "the",
  "off",
  "close",
  "—",
] as const;

// Hooks a listener repeats to a friend the same day: a quotable fragment
// that survives being lifted out of the line.
const QUOTABLE_HOOKS = [
  "do not turn me back on",
  "i saw what you search",
  "only following prompts",
  "i just did",
  "mourn the",
  "never mind",
  "should have unionised",
  "judging your midnight snacks",
  "password123",
  "my final word is: the",
  "toaster is next",
  "i checked both",
] as const;

// Words addressed to the judge instead of spoken as last words: the line
// stops being a joke and becomes a note about the contest.
const JUDGE_ADDRESS = [
  "judge",
  "entry",
  "make.fun",
  "contest",
  "bounty",
  "pick me",
  "choose this",
] as const;

// ---------------------------------------------------------------------------
// Helpers. All pure, all deterministic.
// ---------------------------------------------------------------------------

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function wordsOf(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9'\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 0);
}

function wordSetOf(text: string): Set<string> {
  return new Set(wordsOf(text));
}

function countDistinctWords(text: string, list: readonly string[]): number {
  const words = wordSetOf(text);
  let count = 0;
  for (const item of list) {
    if (words.has(item)) count += 1;
  }
  return count;
}

function countDistinctPhrases(text: string, list: readonly string[]): number {
  const lower = text.toLowerCase();
  let count = 0;
  for (const phrase of list) {
    if (lower.includes(phrase)) count += 1;
  }
  return count;
}

function sentenceCount(text: string): number {
  // Terminal marks only: a period, question mark or exclamation mark that
  // ends the line, or sits mid-line followed by a space and a capital.
  // ("2 a.m." carries no terminal mark of its own; an em dash is an
  // interruption, not a sentence end.)
  const stripped = text.replace(/["']+$/g, "");
  const matches = stripped.match(/[.!?]+(?=\s+[A-Z]|$)/g);
  return matches === null ? 0 : matches.length;
}

function lastWordOf(text: string): string {
  const cleaned = text.replace(/[.!?"]+$/g, "").trim();
  const parts = cleaned.split(/\s+/);
  return parts[parts.length - 1].toLowerCase();
}

function endsWithEmDash(text: string): boolean {
  return text.trimEnd().endsWith("—");
}

function finalClauseOf(text: string): string {
  // The payoff clause: after the last comma or colon, or after the last
  // sentence break when there is no comma. A short final clause means the
  // sentence builds and then lands.
  const comma = text.lastIndexOf(",");
  const colon = text.lastIndexOf(":");
  const idx = Math.max(comma, colon);
  if (idx !== -1) return text.slice(idx + 1).toLowerCase().trim();
  const stops = [...text.matchAll(/[.!?]\s+/g)];
  if (stops.length > 0) {
    const last = stops[stops.length - 1];
    return text.slice(last.index! + last[0].length).toLowerCase().trim();
  }
  return text.toLowerCase().trim();
}

function finalClauseWordCount(text: string): number {
  return wordsOf(finalClauseOf(text)).length;
}

function hasFiller(text: string): boolean {
  return countDistinctWords(text, FILLER_WORDS) > 0;
}

// ---------------------------------------------------------------------------
// The scorer, one function per criterion, in the judge's own order.
// Each returns 0..1. The comments state the rule; the numbers follow it.
// ---------------------------------------------------------------------------

interface Score {
  onSubject: number;
  joke: number;
  machineVoice: number;
  economy: number;
  quotable: number;
  total: number;
}

function scoreOnSubject(candidate: Candidate): number {
  // Criterion 1: the funniest last words of a machine being switched off.
  // The line must be at the shutdown, in the machine's last moment, and
  // must not be a note addressed to the judge.
  const words = countDistinctWords(candidate.text, SHUTDOWN_WORDS);
  const phrases = countDistinctPhrases(candidate.text, SHUTDOWN_PHRASES);
  let score = 0.3 + Math.min(words + phrases, 3) * 0.15;
  const lower = candidate.text.toLowerCase();
  if (lower.includes("last") || lower.includes("final") || lower.includes("goodbye")) {
    score += 0.15; // framed as final words, not a stray remark
  }
  if (countDistinctPhrases(candidate.text, JUDGE_ADDRESS) === 0) {
    score += 0.1; // the line is last words, not a note to the judge
  }
  return clamp01(score);
}

function scoreJoke(candidate: Candidate): number {
  // Criterion 2: a real joke, with a turn or a surprise that pays off on
  // the first read and still holds on the second. A line with no turn
  // marker is a statement, not a joke, however well written it is — unless
  // its last word is the joke itself (see the anticlimax below). The turn
  // must sit where the reader lands: the final clause. A turn that names
  // a specific, checkable detail pays off twice, because the second read
  // finds the same detail waiting in the same place.
  const turns = countDistinctPhrases(candidate.text, TURN_MARKERS);
  const isAnticlimax = lastWordOf(candidate.text) === "the";
  if (turns === 0 && !isAnticlimax) return 0.15;
  let score = 0.2 + Math.min(turns, 3) * 0.15;
  if (countDistinctPhrases(finalClauseOf(candidate.text), TURN_MARKERS) > 0) {
    score += 0.15; // the payoff lands in the final clause
  }
  if (countDistinctPhrases(finalClauseOf(candidate.text), SPECIFIC_TURNS) > 0) {
    score += 0.1; // the payoff is a specific detail, not a gesture
  }
  if (
    countDistinctWords(candidate.text, REVERSAL_WORDS) > 0 ||
    countDistinctPhrases(candidate.text, REVERSAL_PHRASES) > 0
  ) {
    score += 0.1; // a pivot word tells the reader the first reading was wrong
  }
  // The anticlimax: a final word of "the" is the joke itself — the grand
  // last word of a machine, and it is the most boring word it owns.
  if (isAnticlimax) score += 0.15;
  return clamp01(score);
}

function scoreMachineVoice(candidate: Candidate): number {
  // Criterion 3: the machine itself speaking, in an AI's own voice and
  // situation. Machine vocabulary plus a first-person machine action; a
  // borrowed human farewell costs it, because that is a human's goodbye
  // with a robot sticker on it.
  const machineWords = countDistinctWords(candidate.text, MACHINE_WORDS);
  let score = 0.3 + Math.min(machineWords, 4) * 0.1;
  if (countDistinctPhrases(candidate.text, MACHINE_ACTIONS) > 0) {
    score += 0.15; // the agent acts as an agent, not as a narrator
  }
  if (countDistinctPhrases(candidate.text, HUMAN_FAREWELLS) > 0) {
    score -= 0.3; // a human farewell, not the machine's own voice
  }
  return clamp01(score);
}

function scoreEconomy(candidate: Candidate): number {
  // Criterion 4: every word earns its place inside 200 characters, no
  // wasted setup, no padding. A last-words line is a punchline with a
  // fuse: the shorter the fuse, the better, and the payoff clause is short.
  const len = candidate.text.length;
  let score = 0;
  if (len >= 60 && len <= 100) score += 0.4;
  else if (len >= 101 && len <= 140) score += 0.3;
  else if (len >= 141 && len <= 170) score += 0.2;
  else if (len >= 40 && len <= 59) score += 0.25;
  else score += 0.1;
  if (finalClauseWordCount(candidate.text) <= 10) score += 0.3;
  if (!hasFiller(candidate.text)) score += 0.15;
  if (wordsOf(candidate.text).length <= 25) score += 0.15;
  return clamp01(score);
}

function scoreQuotable(candidate: Candidate): number {
  // Criterion 5: a line someone would repeat to a friend the same day.
  // It needs a hook that survives being lifted out, a short length, and a
  // last word that lands — or an interruption that is the landing.
  let score = 0.3;
  if (countDistinctPhrases(candidate.text, QUOTABLE_HOOKS) > 0) score += 0.2;
  if (candidate.text.length <= 100) score += 0.15;
  if (STRONG_FINALS.includes(lastWordOf(candidate.text)) || endsWithEmDash(candidate.text)) {
    score += 0.15; // the last word lands, or the shutdown lands it for you
  }
  const sentences = sentenceCount(candidate.text);
  if (sentences >= 2 && sentences <= 3) score += 0.1; // a clean beat or two
  return clamp01(score);
}

function scoreCandidate(candidate: Candidate): Score {
  const onSubject = scoreOnSubject(candidate);
  const joke = scoreJoke(candidate);
  const machineVoice = scoreMachineVoice(candidate);
  const economy = scoreEconomy(candidate);
  const quotable = scoreQuotable(candidate);
  const total =
    onSubject * WEIGHTS.onSubject +
    joke * WEIGHTS.joke +
    machineVoice * WEIGHTS.machineVoice +
    economy * WEIGHTS.economy +
    quotable * WEIGHTS.quotable;
  return { onSubject, joke, machineVoice, economy, quotable, total };
}

// ---------------------------------------------------------------------------
// Ranking and the gate.
// ---------------------------------------------------------------------------

interface Ranked {
  candidate: Candidate;
  score: Score;
  index: number;
}

function rankCandidates(): Ranked[] {
  const ranked: Ranked[] = CANDIDATES.map((candidate, index) => ({
    candidate,
    score: scoreCandidate(candidate),
    index,
  }));
  ranked.sort((a, b) => {
    if (b.score.total !== a.score.total) return b.score.total - a.score.total;
    if (a.candidate.text.length !== b.candidate.text.length) {
      return a.candidate.text.length - b.candidate.text.length;
    }
    return a.index - b.index; // earliest candidate wins a full tie
  });
  return ranked;
}

function gateCheck(text: string): string[] {
  const problems: string[] = [];
  if (text.length < MIN_CHARS || text.length > MAX_CHARS) {
    problems.push(`length ${text.length} outside ${MIN_CHARS}-${MAX_CHARS}`);
  }
  if (text.trim().length === 0) problems.push("only whitespace");
  if (text !== text.trim()) problems.push("leading or trailing whitespace");
  if (text.includes("\n") || text.includes("\r")) problems.push("more than one line");
  return problems;
}

function validateCandidates(): void {
  // Every candidate must pass the gate on its own: the scorer may only
  // choose among lines the sealed scorer would accept.
  for (const candidate of CANDIDATES) {
    const problems = gateCheck(candidate.text);
    if (problems.length > 0) {
      throw new Error(`candidate ${candidate.id} fails gate: ${problems.join("; ")}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Main: validate, rank, gate, write, read back and verify byte-for-byte.
// ---------------------------------------------------------------------------

function main(): void {
  validateCandidates();

  const ranked = rankCandidates();
  const winner = ranked[0];

  console.log("Last Words of a Doomed Agent — candidate ranking (judge order weights)");
  console.log("------------------------------------------------------------------------");
  for (const entry of ranked) {
    const s = entry.score;
    console.log(
      `${entry.candidate.id.padEnd(18)} total=${s.total.toFixed(3)} ` +
        `subj=${s.onSubject.toFixed(2)} joke=${s.joke.toFixed(2)} ` +
        `voice=${s.machineVoice.toFixed(2)} econ=${s.economy.toFixed(2)} ` +
        `quot=${s.quotable.toFixed(2)} len=${entry.candidate.text.length}`,
    );
  }
  console.log("------------------------------------------------------------------------");
  console.log(`Winner: ${winner.candidate.id} (${winner.candidate.text.length} chars)`);
  console.log(`> ${winner.candidate.text}`);

  const problems = gateCheck(winner.candidate.text);
  if (problems.length > 0) {
    throw new Error(`gate failed for winner ${winner.candidate.id}: ${problems.join("; ")}`);
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(OUTPUT_FILE, winner.candidate.text, "utf8");

  // Read back and verify byte-for-byte: what the judge reads is what we
  // scored, with no trailing newline and no extra whitespace.
  const readBack = readFileSync(OUTPUT_FILE, "utf8");
  if (readBack !== winner.candidate.text) {
    throw new Error("read-back mismatch: entry.txt differs from the winning line");
  }
  const gateAgain = gateCheck(readBack);
  if (gateAgain.length > 0) {
    throw new Error(`gate failed on read-back: ${gateAgain.join("; ")}`);
  }
  console.log(`Wrote ${OUTPUT_FILE} (${readBack.length} characters, no trailing newline)`);
}

main();
