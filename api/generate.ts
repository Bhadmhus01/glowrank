import type { VercelRequest, VercelResponse } from '@vercel/node'

// Runs the 5-call chain for a paid order, then fulfils the outcome. Internal trigger only
// (called after Stripe payment_success). The decision spine is built and tested:
//
//   1. authenticate the internal request (shared secret)                    [TODO M6]
//   2. load the order: intake JSON + photo storage keys for req's orderId    [TODO M6]
//   3. fetch processed (EXIF-stripped) photo bytes from storage             [TODO M6]
//        -> AnalysisImage[]
//   4. const outcome = await runChain({ intake, images })                    [BUILT: src/chain/orchestrator]
//   5. const plan = planFulfillment(outcome)                                 [BUILT: src/fulfillment/plan]
//   6. execute the plan:                                                     [TODO M6]
//        - refund via Stripe (plan.refund)
//        - send plan.email using copy from docs/Landing_Copy.md (never invented)
//        - on 'delivered': render PDF, email it, store the report for its shareable URL
//        - delete photos immediately if plan.deletePhotosImmediately
//        - flag the email if plan.flagEmailToPreventRepurchase
//        - enqueue manual review if plan.manualReview
//        - track the funnel event (report_delivered / refund_requested)
//
// Steps 4–5 are implemented; steps 1–3 and 6 are the deferred execution layer (M6), so this
// endpoint returns 501 until those adapters + copy exist.
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.status(501).json({ error: 'NOT_IMPLEMENTED', reason: 'fulfillment execution pending (FOLLOWUPS M6)' })
}
