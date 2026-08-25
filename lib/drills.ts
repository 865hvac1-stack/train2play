/**
 * In-house suggested drills by sport + age band.
 * Curated (not AI) so recommendations stay age-appropriate and consistent.
 * Later: optional AI layer can rank these by athlete metrics.
 */

export type AgeBandId = "8-10" | "11-13" | "14-16" | "17-18" | "adult";

export type Drill = {
  id: string;
  title: string;
  focus: string;
  durationMin: number;
  equipment: string;
  howTo: string;
  coachingCue: string;
};

export type AgeBand = {
  id: AgeBandId;
  label: string;
  minAge: number;
  maxAge: number;
};

export const AGE_BANDS: AgeBand[] = [
  { id: "8-10", label: "Ages 8–10", minAge: 8, maxAge: 10 },
  { id: "11-13", label: "Ages 11–13", minAge: 11, maxAge: 13 },
  { id: "14-16", label: "Ages 14–16", minAge: 14, maxAge: 16 },
  { id: "17-18", label: "Ages 17–18", minAge: 17, maxAge: 18 },
  { id: "adult", label: "19+", minAge: 19, maxAge: 99 },
];

const BASEBALL_SOFTBALL: Record<AgeBandId, Drill[]> = {
  "8-10": [
    {
      id: "bb-810-toss",
      title: "Knee toss & catch",
      focus: "Hand-eye & soft hands",
      durationMin: 10,
      equipment: "Ball, glove",
      howTo:
        "Kneel 8–10 ft apart. Soft toss back and forth for 25 quality catches each. Keep glove out early.",
      coachingCue: "Quiet feet, soft glove, eyes on the ball all the way in.",
    },
    {
      id: "bb-810-tee",
      title: "Tee contact reps",
      focus: "Swing path",
      durationMin: 12,
      equipment: "Tee, bat, balls",
      howTo:
        "10 swings focusing on level contact through the middle. Reset stance every swing.",
      coachingCue: "See the ball hit the bat — don’t swing for the fence yet.",
    },
    {
      id: "bb-810-run",
      title: "Base-running game",
      focus: "Athleticism & fun",
      durationMin: 10,
      equipment: "Bases or cones",
      howTo:
        "Home to first races. Teach running through the bag, then jog back.",
      coachingCue: "Run hard through first — don’t slow up early.",
    },
  ],
  "11-13": [
    {
      id: "bb-1113-longtoss",
      title: "Progressive long toss",
      focus: "Arm strength",
      durationMin: 15,
      equipment: "Ball, glove",
      howTo:
        "Warm arm at 30–45 ft, then step back every 5 throws to a max comfortable distance. Finish with 8 pull-downs.",
      coachingCue: "Stay on top of the ball — no short-arming as distance grows.",
    },
    {
      id: "bb-1113-fronttoss",
      title: "Front toss timing",
      focus: "Hitting timing",
      durationMin: 15,
      equipment: "Screen, bat, balls",
      howTo:
        "3 rounds of 8 quality swings. Mix middle / in / away. Track contact quality, not exit only.",
      coachingCue: "Load early, stay balanced — wait on the outer half.",
    },
    {
      id: "bb-1113-field",
      title: "Ground-ball funnel",
      focus: "Infield footwork",
      durationMin: 12,
      equipment: "Balls, gloves",
      howTo:
        "Coach rolls 15 grounders. Athlete fields through the ball and makes a firm throw to a target.",
      coachingCue: "Get the glove out front — feet work to the ball, not around it.",
    },
  ],
  "14-16": [
    {
      id: "bb-1416-velo",
      title: "Intent throw series",
      focus: "Throwing velo",
      durationMin: 18,
      equipment: "Radar optional, mound or flat ground",
      howTo:
        "After full warm-up: 8 medium, 6 hard, 4 max-intent throws with full recovery between max throws.",
      coachingCue: "Intent with direction — don’t overthrow the finish.",
    },
    {
      id: "bb-1416-exit",
      title: "Exit-velo rounds",
      focus: "Bat speed / exit velo",
      durationMin: 20,
      equipment: "Machine or front toss, bat",
      howTo:
        "3×6 competitive swings. Log best and average exit if available. Rest 60s between rounds.",
      coachingCue: "Attack the inner half of the ball — stay through contact.",
    },
    {
      id: "bb-1416-medball",
      title: "Rotational med-ball throws",
      focus: "Power transfer",
      durationMin: 12,
      equipment: "6–10 lb med ball",
      howTo:
        "3×8 rotational throws into a wall or to a partner. Emphasize hip lead then hands.",
      coachingCue: "Hips clear first — hands follow, don’t rush.",
    },
  ],
  "17-18": [
    {
      id: "bb-1718-command",
      title: "Command bullpen",
      focus: "Pitch command",
      durationMin: 25,
      equipment: "Mound, catcher or net",
      howTo:
        "30–40 pitch mix: FB glove side / arm side, then CH and BB. Chart strikes by pitch type.",
      coachingCue: "Win the edge of the zone — miss less than miss up.",
    },
    {
      id: "bb-1718-vsvelo",
      title: "Live BP vs velo",
      focus: "Game speed hitting",
      durationMin: 20,
      equipment: "Machine or pitcher",
      howTo:
        "Compete for 20–25 quality swings at game-ish velo. Track hard contact %.",
      coachingCue: "Simplify the swing — see it early, decide late.",
    },
    {
      id: "bb-1718-recovery",
      title: "Arm care circuit",
      focus: "Recovery & durability",
      durationMin: 15,
      equipment: "Bands, light DBs",
      howTo:
        "External rotation, scap rows, sleeper stretch, and light long-toss finish. Log RPE.",
      coachingCue: "Quality over load — leave the arm feeling better than when you started.",
    },
  ],
  adult: [
    {
      id: "bb-adult-maintain",
      title: "Maintenance throw + hit",
      focus: "Stay sharp",
      durationMin: 30,
      equipment: "Full kit",
      howTo:
        "Structured warm-up, 15 quality throws, 15 competitive swings, 10 minutes mobility cool-down.",
      coachingCue: "Train the skill you need this weekend — not every tool every day.",
    },
  ],
};

const BASKETBALL: Record<AgeBandId, Drill[]> = {
  "8-10": [
    {
      id: "bk-810-dribble",
      title: "Stationary ball control",
      focus: "Ball handling",
      durationMin: 10,
      equipment: "Basketball",
      howTo: "Pound dribbles right/left, crossover, and figure-8 for 45s each × 2.",
      coachingCue: "Eyes up — bounce the ball hard enough to hear it.",
    },
    {
      id: "bk-810-layup",
      title: "Layup lines both sides",
      focus: "Finishing",
      durationMin: 12,
      equipment: "Hoop, ball",
      howTo: "Right-hand and left-hand layups from the wing. 10 makes each side.",
      coachingCue: "Outside foot plant, soft off the glass.",
    },
  ],
  "11-13": [
    {
      id: "bk-1113-form",
      title: "Form shooting ladder",
      focus: "Shot mechanics",
      durationMin: 15,
      equipment: "Hoop, ball",
      howTo: "Close range form shots → 1-dribble pull-ups. Make 10 before moving back.",
      coachingCue: "Hold the follow-through until the ball hits net.",
    },
    {
      id: "bk-1113-defense",
      title: "Slide & closeout",
      focus: "Defense",
      durationMin: 12,
      equipment: "Cones",
      howTo: "Defensive slides between cones, then closeout to a shooter. 6 reps each way.",
      coachingCue: "Stay low — don’t hop on the closeout.",
    },
  ],
  "14-16": [
    {
      id: "bk-1416-iso",
      title: "1v1 constraint games",
      focus: "Decision making",
      durationMin: 18,
      equipment: "Half court",
      howTo: "Play 1v1 from the wing with 3 dribble max. Winner stays. Track stops and scores.",
      coachingCue: "Create with pace change, not just speed.",
    },
    {
      id: "bk-1416-catchshoot",
      title: "Catch-and-shoot circuit",
      focus: "Game shots",
      durationMin: 15,
      equipment: "Ball, passer",
      howTo: "Corner / wing / slot — 8 makes each. Sprint to next spot after each make.",
      coachingCue: "Feet set before the catch — rise straight up.",
    },
  ],
  "17-18": [
    {
      id: "bk-1718-film",
      title: "Skill + film combo",
      focus: "IQ + skill",
      durationMin: 25,
      equipment: "Hoop, phone for film",
      howTo:
        "15 minutes competitive shooting, then film 5 possessions and note one fix for next session.",
      coachingCue: "One cue per session — don’t overload the next play.",
    },
  ],
  adult: [
    {
      id: "bk-adult-open",
      title: "Open gym skill block",
      focus: "Maintenance",
      durationMin: 30,
      equipment: "Hoop, ball",
      howTo: "10 min handle, 10 min shooting, 10 min finishing contact drills.",
      coachingCue: "Train game speed even in empty gym.",
    },
  ],
};

const VOLLEYBALL: Record<AgeBandId, Drill[]> = {
  "8-10": [
    {
      id: "vb-810-pass",
      title: "Partner platform passes",
      focus: "Passing",
      durationMin: 10,
      equipment: "Volleyball",
      howTo: "20 controlled passes each. Count consecutive clean contacts.",
      coachingCue: "Flat platform, move feet to the ball.",
    },
  ],
  "11-13": [
    {
      id: "vb-1113-serve",
      title: "Serve consistency",
      focus: "Serving",
      durationMin: 15,
      equipment: "Court, balls",
      howTo: "Aim for deep zones. Make 8/10 before switching zones.",
      coachingCue: "Same toss every time — toss is the serve.",
    },
    {
      id: "vb-1113-approach",
      title: "Approach footwork",
      focus: "Attack approach",
      durationMin: 12,
      equipment: "Cones or tape",
      howTo: "Left-right-left approach without a ball, then with a tossed ball. 12 reps.",
      coachingCue: "Last two steps are the plant — explode up, not forward.",
    },
  ],
  "14-16": [
    {
      id: "vb-1416-pepper",
      title: "Competitive pepper",
      focus: "Ball control under pace",
      durationMin: 15,
      equipment: "Ball",
      howTo: "Pepper with a miss = restart. Play to 15 clean sequences.",
      coachingCue: "Angle the platform — don’t swing at every ball.",
    },
  ],
  "17-18": [
    {
      id: "vb-1718-serve-receive",
      title: "Serve-receive pressure",
      focus: "Pass & transition",
      durationMin: 20,
      equipment: "Full court",
      howTo: "Live serve receive to a target setter. Chart pass rating 0–3 for 20 serves.",
      coachingCue: "Early platform — beat the ball to the spot.",
    },
  ],
  adult: [
    {
      id: "vb-adult-skill",
      title: "Skill circuit",
      focus: "All-around",
      durationMin: 25,
      equipment: "Court",
      howTo: "Serve, pass, set, hit — 5 quality reps each, then short scrimmage points.",
      coachingCue: "Quality contacts over volume.",
    },
  ],
};

const FOOTBALL: Record<AgeBandId, Drill[]> = {
  "8-10": [
    {
      id: "fb-810-catch",
      title: "Soft hands catch game",
      focus: "Receiving",
      durationMin: 10,
      equipment: "Football",
      howTo: "Partner tosses. Catch away from body, tuck, and sprint 5 yards. 20 catches.",
      coachingCue: "Look it in — tuck high and tight.",
    },
  ],
  "11-13": [
    {
      id: "fb-1113-route",
      title: "Route tree basics",
      focus: "Route running",
      durationMin: 15,
      equipment: "Cones, ball",
      howTo: "Slant, out, go — 6 reps each with a toss at the break.",
      coachingCue: "Sell vertical stem before the break.",
    },
    {
      id: "fb-1113-footwork",
      title: "Agility ladder + burst",
      focus: "Foot speed",
      durationMin: 12,
      equipment: "Ladder or cones",
      howTo: "3 ladder patterns + 10-yard burst. 4 rounds with walk-back recovery.",
      coachingCue: "Quick feet, tall chest — don’t look down.",
    },
  ],
  "14-16": [
    {
      id: "fb-1416-release",
      title: "Press release work",
      focus: "WR / DB release",
      durationMin: 18,
      equipment: "Partner",
      howTo: "Work swim, rip, and speed release vs a partner. 8 each. Film one set.",
      coachingCue: "Hands violent, feet patient — win the first step.",
    },
  ],
  "17-18": [
    {
      id: "fb-1718-7v7",
      title: "7-on-7 tempo",
      focus: "Timing & IQ",
      durationMin: 25,
      equipment: "Field",
      howTo: "Script 12 plays. Live tempo, no contact. Review 3 plays after.",
      coachingCue: "Know the adjustment before the snap.",
    },
  ],
  adult: [
    {
      id: "fb-adult-skill",
      title: "Position skill block",
      focus: "Position work",
      durationMin: 30,
      equipment: "Varies",
      howTo: "Warm-up, 20 minutes position-specific individual, short competitive period.",
      coachingCue: "Train the job you play on Friday.",
    },
  ],
};

const SOCCER: Record<AgeBandId, Drill[]> = {
  "8-10": [
    {
      id: "sc-810-dribble",
      title: "Cone weave dribble",
      focus: "Ball mastery",
      durationMin: 10,
      equipment: "Ball, cones",
      howTo: "Weave through 6 cones both feet. Race for time after 3 clean reps.",
      coachingCue: "Soft touches — ball stays within a step.",
    },
  ],
  "11-13": [
    {
      id: "sc-1113-passing",
      title: "Wall / partner passing",
      focus: "Passing accuracy",
      durationMin: 12,
      equipment: "Ball",
      howTo: "2-touch then 1-touch sequences. 40 quality passes each foot.",
      coachingCue: "Plant foot points to the target.",
    },
    {
      id: "sc-1113-1v1",
      title: "1v1 to small goal",
      focus: "Attacking / defending",
      durationMin: 15,
      equipment: "Cones as goals",
      howTo: "Play to 5 goals. Rotate attacker/defender each score.",
      coachingCue: "Attacker: change pace. Defender: force weak foot.",
    },
  ],
  "14-16": [
    {
      id: "sc-1416-rondo",
      title: "Rondo 4v1 / 5v2",
      focus: "Possession IQ",
      durationMin: 18,
      equipment: "Grid",
      howTo: "Keep-away with limited touches. Loser in the middle after 2 turnovers.",
      coachingCue: "Scan before the ball arrives.",
    },
  ],
  "17-18": [
    {
      id: "sc-1718-finishing",
      title: "Finishing patterns",
      focus: "Shooting under pressure",
      durationMin: 20,
      equipment: "Goal, balls",
      howTo: "Receive, set, finish from 3 patterns. 8 reps each. Track on-target %.",
      coachingCue: "Head steady — strike through the middle of the ball.",
    },
  ],
  adult: [
    {
      id: "sc-adult-tech",
      title: "Technical + small sided",
      focus: "Match prep",
      durationMin: 30,
      equipment: "Field",
      howTo: "10 min technique, 20 min small-sided game with constraints.",
      coachingCue: "Play the way you’ll play on game day.",
    },
  ],
};

const STRENGTH: Record<AgeBandId, Drill[]> = {
  "8-10": [
    {
      id: "sa-810-animal",
      title: "Animal movements",
      focus: "Athleticism",
      durationMin: 10,
      equipment: "None",
      howTo: "Bear crawl, frog hop, lateral shuffle — 30s each × 3 rounds.",
      coachingCue: "Move athletic — quality positions over speed.",
    },
  ],
  "11-13": [
    {
      id: "sa-1113-bodyweight",
      title: "Bodyweight circuit",
      focus: "General strength",
      durationMin: 15,
      equipment: "None",
      howTo: "Squats, push-ups, glute bridges, plank — 3×8–12. Rest as needed.",
      coachingCue: "Full range, controlled tempo — no bouncing.",
    },
  ],
  "14-16": [
    {
      id: "sa-1416-power",
      title: "Jump & land series",
      focus: "Power + landing mechanics",
      durationMin: 15,
      equipment: "Cones or box (low)",
      howTo: "Broad jumps, verticals, single-leg lands — 3×5 with full reset.",
      coachingCue: "Stick the landing soft and quiet.",
    },
    {
      id: "sa-1416-hinge",
      title: "Hinge pattern strength",
      focus: "Posterior chain",
      durationMin: 18,
      equipment: "DB or KB",
      howTo: "RDL pattern 3×8, then hip thrusts 3×10. Film one set for form.",
      coachingCue: "Push hips back — feel hamstrings, not low back.",
    },
  ],
  "17-18": [
    {
      id: "sa-1718-speed",
      title: "Acceleration mechanics",
      focus: "Speed",
      durationMin: 20,
      equipment: "Cones",
      howTo: "10- and 20-yard accelerations × 6 with full recovery. Film first step.",
      coachingCue: "Drive angles — push the ground back, don’t reach.",
    },
  ],
  adult: [
    {
      id: "sa-adult-lift",
      title: "Performance lift block",
      focus: "Strength",
      durationMin: 35,
      equipment: "Weights",
      howTo: "Main lift + 2 accessories + mobility finish. Log loads.",
      coachingCue: "Progressive overload with clean technique.",
    },
  ],
};

function normalizeSport(sport: string): string {
  return sport.trim().toLowerCase();
}

function drillsForSport(sport: string): Record<AgeBandId, Drill[]> {
  const s = normalizeSport(sport);
  if (s.includes("softball") || s.includes("baseball")) return BASEBALL_SOFTBALL;
  if (s.includes("basket")) return BASKETBALL;
  if (s.includes("volley")) return VOLLEYBALL;
  if (s.includes("football") || s === "flag") return FOOTBALL;
  if (s.includes("soccer") || s.includes("futbol")) return SOCCER;
  if (
    s.includes("strength") ||
    s.includes("speed") ||
    s.includes("conditioning") ||
    s.includes("s&c")
  ) {
    return STRENGTH;
  }
  // Default multi-sport athletes to athletic development
  return STRENGTH;
}

export function ageFromDateOfBirth(dateOfBirth: Date | null | undefined): number | null {
  if (!dateOfBirth) return null;
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())
  ) {
    age -= 1;
  }
  return age >= 0 && age < 120 ? age : null;
}

export function ageBandFromAge(age: number | null): AgeBand {
  if (age === null) {
    return AGE_BANDS.find((b) => b.id === "14-16")!;
  }
  for (const band of AGE_BANDS) {
    if (age >= band.minAge && age <= band.maxAge) return band;
  }
  if (age < 8) return AGE_BANDS[0]!;
  return AGE_BANDS[AGE_BANDS.length - 1]!;
}

export function getSuggestedDrills(options: {
  sport: string;
  dateOfBirth?: Date | null;
  ageBandId?: AgeBandId;
  limit?: number;
}): { band: AgeBand; drills: Drill[]; sportLabel: string } {
  const age =
    options.ageBandId != null
      ? null
      : ageFromDateOfBirth(options.dateOfBirth ?? null);
  const band = options.ageBandId
    ? AGE_BANDS.find((b) => b.id === options.ageBandId) ?? ageBandFromAge(age)
    : ageBandFromAge(age);
  const catalog = drillsForSport(options.sport);
  const drills = (catalog[band.id] ?? catalog["14-16"] ?? []).slice(
    0,
    options.limit ?? 3,
  );
  return {
    band,
    drills,
    sportLabel: options.sport.trim() || "Multi-sport",
  };
}
