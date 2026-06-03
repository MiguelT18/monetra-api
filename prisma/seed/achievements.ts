import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL!,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

const ACHIEVEMENTS = [
  // STUDENT
  {
    key: "first-lesson",
    title: "Primera lección",
    description: "Completa tu primera lección en cualquier curso.",
    icon: "FiPlayCircle",
    xpReward: 50,
    role: "STUDENT" as const,
  },
  {
    key: "streak-7",
    title: "Racha semanal",
    description: "Estudia al menos 15 minutos durante 7 días seguidos.",
    icon: "FiZap",
    xpReward: 200,
    role: "STUDENT" as const,
  },
  {
    key: "first-course",
    title: "Graduado",
    description: "Termina por completo tu primer curso de la plataforma.",
    icon: "FiAward",
    xpReward: 500,
    role: "STUDENT" as const,
  },
  {
    key: "community",
    title: "Voz en la comunidad",
    description: "Participa en 5 hilos del foro o grupos de estudio.",
    icon: "FiMessageCircle",
    xpReward: 150,
    role: "STUDENT" as const,
  },
  {
    key: "certified",
    title: "Certificado oficial",
    description: "Obtén tu primer certificado verificable al completar un curso.",
    icon: "FiCheckCircle",
    xpReward: 300,
    role: "STUDENT" as const,
  },
  {
    key: "explorer",
    title: "Explorador",
    description: "Inscríbete en 3 cursos de categorías distintas.",
    icon: "FiBookOpen",
    xpReward: 100,
    role: "STUDENT" as const,
  },
  // CREATOR
  {
    key: "first-product",
    title: "Primer lanzamiento",
    description: "Publica tu primer infoproducto en el catálogo.",
    icon: "FiPackage",
    xpReward: 250,
    role: "CREATOR" as const,
  },
  {
    key: "first-sale",
    title: "Primera venta",
    description: "Registra tu primera venta confirmada en la plataforma.",
    icon: "FiShoppingBag",
    xpReward: 400,
    role: "CREATOR" as const,
  },
  {
    key: "reviews",
    title: "Producto valorado",
    description: "Recibe 10 reseñas con 4 estrellas o más en un mismo producto.",
    icon: "FiStar",
    xpReward: 350,
    role: "CREATOR" as const,
  },
  {
    key: "affiliate-network",
    title: "Red de afiliados",
    description: "Activa un programa de afiliados con al menos 5 promotores.",
    icon: "FiUsers",
    xpReward: 500,
    role: "CREATOR" as const,
  },
  {
    key: "revenue-milestone",
    title: "Hito de ingresos",
    description: "Alcanza €1.000 en ventas acumuladas en un periodo de 30 días.",
    icon: "FiDollarSign",
    xpReward: 600,
    role: "CREATOR" as const,
  },
  {
    key: "catalog-5",
    title: "Catálogo en expansión",
    description: "Mantén 5 productos activos publicados simultáneamente.",
    icon: "FiLayers",
    xpReward: 200,
    role: "CREATOR" as const,
  },
  // AFFILIATE
  {
    key: "first-link",
    title: "Primer enlace",
    description: "Genera y comparte tu primer enlace de afiliado con seguimiento.",
    icon: "FiLink",
    xpReward: 75,
    role: "AFFILIATE" as const,
  },
  {
    key: "first-commission",
    title: "Primera comisión",
    description: "Recibe tu primera comisión liquidada por una venta atribuida.",
    icon: "FiDollarSign",
    xpReward: 300,
    role: "AFFILIATE" as const,
  },
  {
    key: "clicks-100",
    title: "Tráfico constante",
    description: "Acumula 100 clics válidos en tus enlaces en un mes.",
    icon: "FiTrendingUp",
    xpReward: 150,
    role: "AFFILIATE" as const,
  },
  {
    key: "conversions-10",
    title: "Conversor nato",
    description: "Genera 10 conversiones confirmadas en un mismo programa.",
    icon: "FiTarget",
    xpReward: 400,
    role: "AFFILIATE" as const,
  },
  {
    key: "top-affiliate",
    title: "Top del mes",
    description: "Entra en el top 10 de afiliados de un creador verificado.",
    icon: "FiAward",
    xpReward: 500,
    role: "AFFILIATE" as const,
  },
  {
    key: "multi-program",
    title: "Cartera diversificada",
    description: "Promociona activamente 3 programas de nichos distintos.",
    icon: "FiShare2",
    xpReward: 200,
    role: "AFFILIATE" as const,
  },
];

async function main() {
  for (const achievement of ACHIEVEMENTS) {
    await prisma.achievement.upsert({
      where: { key: achievement.key },
      update: achievement,
      create: achievement,
    });
  }

  console.log(`Seeded ${ACHIEVEMENTS.length} achievements`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
