export async function generateSchedule() {
  const source = './info/schedule.json';
  const targetDir = './site/info';
  const target = `${targetDir}/schedule.json`;

  try {
    await Deno.mkdir(targetDir, { recursive: true });
    const content = await Deno.readTextFile(source);
    await Deno.writeTextFile(target, content);
    console.log(`Copied schedule data to ${target}`);
  } catch (error) {
    console.error('Failed to generate schedule data for site:', error);
    throw error;
  }
}

if (import.meta.main) {
  await generateSchedule();
}
