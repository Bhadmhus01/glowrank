// Launch-readiness preflight — run before deploying / going live:
//   npm run preflight
//
// Prints a non-secret readiness table (presence only, never values) and exits non-zero if any
// launch-critical integration is missing a required variable. Safe to run in CI or locally.

import { checkReadiness } from '../src/config/env'

function main(): void {
  const report = checkReadiness()

  console.log('\nGlowRank launch preflight\n=========================\n')

  for (const integration of report.integrations) {
    const tag = integration.launchCritical ? 'launch-critical' : 'optional'
    const head = integration.ready ? '✅' : integration.launchCritical ? '❌' : '⚠️ '
    console.log(`${head} ${integration.label}  (${tag})`)
    for (const v of integration.vars) {
      const mark = v.present ? '·  set    ' : v.required ? '!  MISSING' : '-  unset  '
      const note = v.note ? `  — ${v.note}` : ''
      console.log(`     ${mark} ${v.name}${note}`)
    }
    console.log('')
  }

  if (report.launchReady) {
    console.log('Result: ✅ all launch-critical integrations are configured.\n')
    process.exit(0)
  }

  console.log('Result: ❌ NOT launch-ready. Missing required vars:')
  for (const name of report.missingRequired) console.log(`  - ${name}`)
  console.log('')
  process.exit(1)
}

main()
