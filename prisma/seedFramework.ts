import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

type SeedAction = { statement: string; weight?: number };

type SeedCompetency = {
  name: string;
  isConditional?: boolean;
  conditionalQuestionText?: string | null;
  actions: SeedAction[];
};

type SeedCategory = {
  name: string;
  targetsByLevel?: Record<string, number>;
  // Normally one competency per level, but a level key may map to an array
  // if the source sheet turns out to have more than one competency for the
  // same category+level.
  competenciesByLevel: Record<string, SeedCompetency | SeedCompetency[]>;
};

type SeedFile = {
  framework: { name: string; description?: string };
  scale: {
    name: string;
    description?: string;
    points: { score: number; label: string; percent: number }[];
  };
  levels: { name: string; shortName: string; description: string }[];
  categories: SeedCategory[];
};

const SEED_FILE = path.join(__dirname, "seed-data", "pm-framework.json");

export async function seedFramework(prisma: PrismaClient) {
  if (!fs.existsSync(SEED_FILE)) {
    console.log(`No seed data file at ${SEED_FILE}, skipping framework seed.`);
    return;
  }

  const data: SeedFile = JSON.parse(fs.readFileSync(SEED_FILE, "utf-8"));

  const existing = await prisma.framework.findFirst({
    where: { name: data.framework.name },
  });
  if (existing) {
    console.log(
      `Framework "${data.framework.name}" already exists, skipping framework seed.`,
    );
    return;
  }

  const scale = await prisma.scale.create({
    data: {
      name: data.scale.name,
      description: data.scale.description,
      points: {
        create: data.scale.points.map((p, i) => ({
          score: p.score,
          label: p.label,
          percent: p.percent,
          sortOrder: i,
        })),
      },
    },
  });

  const framework = await prisma.framework.create({
    data: {
      name: data.framework.name,
      description: data.framework.description,
      scaleId: scale.id,
      rollupStrategy: "WEIGHTED_AVERAGE",
    },
  });

  const levelByName = new Map<string, { id: string }>();
  for (const [i, lvl] of data.levels.entries()) {
    const level = await prisma.level.create({
      data: {
        frameworkId: framework.id,
        name: lvl.name,
        shortName: lvl.shortName,
        description: lvl.description,
        sortOrder: i,
      },
    });
    levelByName.set(lvl.name, level);
  }

  let competencyCount = 0;
  let actionCount = 0;
  let targetCount = 0;

  for (const [catIndex, cat] of data.categories.entries()) {
    const category = await prisma.category.create({
      data: {
        frameworkId: framework.id,
        name: cat.name,
        sortOrder: catIndex,
      },
    });

    for (const [levelName, target] of Object.entries(cat.targetsByLevel ?? {})) {
      const level = levelByName.get(levelName);
      if (!level) continue;
      await prisma.categoryLevelTarget.create({
        data: { categoryId: category.id, levelId: level.id, targetPercent: target },
      });
      targetCount++;
    }

    for (const [levelName, compOrComps] of Object.entries(cat.competenciesByLevel)) {
      const level = levelByName.get(levelName);
      if (!level) {
        console.warn(`Unknown level "${levelName}" referenced in category "${cat.name}", skipping.`);
        continue;
      }
      const comps = Array.isArray(compOrComps) ? compOrComps : [compOrComps];

      for (const [compIndex, comp] of comps.entries()) {
        const competency = await prisma.competency.create({
          data: {
            categoryId: category.id,
            levelId: level.id,
            name: comp.name,
            isConditional: comp.isConditional ?? false,
            conditionalQuestionText: comp.conditionalQuestionText ?? null,
            sortOrder: compIndex,
          },
        });
        competencyCount++;

        for (const [actionIndex, action] of comp.actions.entries()) {
          await prisma.action.create({
            data: {
              competencyId: competency.id,
              statement: action.statement,
              weight: action.weight ?? 1.0,
              sortOrder: actionIndex,
            },
          });
          actionCount++;
        }
      }
    }
  }

  console.log(
    `Seeded framework "${framework.name}": ${data.levels.length} levels, ${data.categories.length} categories, ${competencyCount} competencies, ${actionCount} actions, ${targetCount} category/level targets.`,
  );
}
