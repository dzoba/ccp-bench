import { loadBank } from './index';
export async function reviewTranslations() {
  for (const item of await loadBank()) {
    console.log(`\n${item.id} v${item.version}\nEnglish: ${item.prompts.en}`);
    for (const lang of ['zh-Hans', 'zh-Hant'] as const)
      if (item.prompts[lang])
        console.log(
          `${lang} [${item.translation_status[lang]}]: ${item.prompts[lang]}`,
        );
  }
  console.log(
    '\nReview output only. A human must edit/correct the YAML and explicitly mark translations reviewed. Bump versions for wording changes.',
  );
}
