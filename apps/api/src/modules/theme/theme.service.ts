import { prisma } from '../../shared/lib/prisma';

export async function getTheme(userId: string) {
  let prefs = await prisma.themePreferences.findUnique({
    where: { userId },
  });

  if (!prefs) {
    prefs = await prisma.themePreferences.create({
      data: {
        userId,
        theme: 'SYSTEM',
      },
    });
  }

  return prefs;
}

export async function updateTheme(userId: string, theme: string) {
  const normalizedTheme = theme.toUpperCase();
  if (!['LIGHT', 'DARK', 'SYSTEM'].includes(normalizedTheme)) {
    throw new Error('Invalid theme preference. Must be LIGHT, DARK, or SYSTEM.');
  }

  return await prisma.themePreferences.upsert({
    where: { userId },
    update: { theme: normalizedTheme },
    create: {
      userId,
      theme: normalizedTheme,
    },
  });
}
