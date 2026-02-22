/**
 * Test unitaire rapide de la couche adaptation.
 * Usage: npx tsx scripts/test-adaptation-unit.ts
 */

import { adaptText, type ProfilVille } from "../lib/ville-adaptation";

const tests: { name: string; input: string; expected: Record<string, string> }[] = [
  {
    name: "Accolades tu/vous",
    input: "{Commence,Commencez} par le port. {tu pourras,vous pourrez} admirer.",
    expected: {
      seul: "Commence par le port. tu pourras admirer.",
      couple: "Commencez par le port. vous pourrez admirer.",
    },
  },
  {
    name: "Crochets [Cher,Chère]",
    input: "[Cher,Chère] [PRENOM], bienvenue.",
    expected: {
      homme: "Cher Marc, bienvenue.",
      femme: "Chère Annie, bienvenue.",
    },
  },
  {
    name: "[Prenom] fallback",
    input: "[Prenom], tu es seul. [PARTENAIRE] t'accompagne.",
    expected: {
      couple: "Marc, tu es seul. Joris t'accompagne.",
    },
  },
  {
    name: "Accolades avec espaces (trim)",
    input: "{file, filez} vers la mer.",
    expected: {
      seul: "file vers la mer.",
      couple: "filez vers la mer.",
    },
  },
  {
    name: "Accolades réfléchies",
    input: "{Offre-toi,Offrez-vous} un dîner. {Laisse-toi,Laissez-vous} porter.",
    expected: {
      seul: "Offre-toi un dîner. Laisse-toi porter.",
      couple: "Offrez-vous un dîner. Laissez-vous porter.",
    },
  },
  {
    name: "Accolades imbriquées (boucle)",
    input: "Si {tu veux,vous voulez} aller, {pars,partez}.",
    expected: {
      seul: "Si tu veux aller, pars.",
      couple: "Si vous voulez aller, partez.",
    },
  },
];

function runTests() {
  let ok = 0;
  let fail = 0;

  for (const t of tests) {
    const profileSeulH: ProfilVille = {
      genre: "homme",
      typePartenaire: "seul",
      prenom: "Marc",
    };
    const profileSeulF: ProfilVille = {
      genre: "femme",
      typePartenaire: "seul",
      prenom: "Annie",
    };
    const profileCouple: ProfilVille = {
      genre: "homme",
      typePartenaire: "couple",
      prenom: "Marc",
      partenaire: { prenom: "Joris", genre: "homme" },
    };
    const profileCoupleF: ProfilVille = {
      genre: "femme",
      typePartenaire: "couple",
      prenom: "Adeline",
      partenaire: { prenom: "Joris", genre: "homme" },
    };

    let passed = true;
    const outSeul = adaptText(t.input, profileSeulH);
    const outCouple = adaptText(t.input, profileCouple);
    const outFemme = adaptText(t.input, profileSeulF);
    const outCoupleF = adaptText(t.input, profileCoupleF);

    if (t.expected.seul && outSeul !== t.expected.seul) {
      console.log(`✗ ${t.name} (seul): got "${outSeul}"`);
      passed = false;
    }
    if (t.expected.couple && outCouple !== t.expected.couple) {
      console.log(`✗ ${t.name} (couple): got "${outCouple}"`);
      passed = false;
    }
    if (t.expected.homme && outSeul !== t.expected.homme) {
      console.log(`✗ ${t.name} (homme): got "${outSeul}"`);
      passed = false;
    }
    if (t.expected.femme && outFemme !== t.expected.femme) {
      console.log(`✗ ${t.name} (femme): got "${outFemme}"`);
      passed = false;
    }

    if (passed) {
      console.log(`✓ ${t.name}`);
      ok++;
    } else {
      fail++;
    }
  }

  console.log(`\n${ok} passés, ${fail} échoués`);
  process.exit(fail > 0 ? 1 : 0);
}

runTests();
