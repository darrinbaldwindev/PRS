# Immutable AgentOS adversarial probe

Run `node scripts/challenge-agentos.mjs /path/to/AgentOS EXACT_40_CHAR_SHA bridge`
or select `autonomy`. This reads the requested committed module via git show,
records exact head/tree/module hash and executes only the pure helper. It never
starts the worker, scheduler, transport or production writes. Use only trusted
repository revisions: importing source executes that module's top-level code.

Baseline bridge `5cc27c96d48e18419cc678fd03b37c9e1c7ccd70`: eight of twelve
negative cases reproduce false reportable completion. Autonomy
`9cfe7aa38b2ffccd4872f0ba69ffbd6a4f4c6b80`: nineteen of twenty negative cases
reproduce a false grant (truthy string production was already denied).
Positive controls ensure an always-deny stub is not treated as a successful probe.
Exit 1 means defect or insufficient evidence; exit 0 means only these negative
cases passed. Every report expressly withholds assurance certification/promotion.

Repair probes: all 12 bridge and 20 autonomy negatives pass. Captured repair
reports refer to local immutable commits; their source trees match published
AgentOS PR #94 / #95 trees. They are not independent reviewer attestations.
The existing Python suite remains the normal CI gate; this Node probe is an
additional offline executable challenge, not a second assurance/runtime service.

Coverage includes missing Green identity, independent identity conflicts,
duplicate other-wake completion, missing receipt/result, failed Green and unknown
budget, and non-Boolean grant/context fields. Limits: no physical Windows run,
no crash/power-loss injection in this probe, no remote authenticity proof, no
full Night Shift integration or assurance of main. Main baseline local suite
257 passed but main lacks these draft bridge/autonomy helper modules.

The previous raw runtime snapshot regression remains required: successful
internal reconciliation does not imply resolved/provenanced/fresh evidence or
independent execution census. Runtime completion and assurance are distinct.

Publication continuation: based on current PR #16 head cc453d163b7efce901e7a2ebf8c029a98be8aee7, preserving its stronger result/Green correlation and historical snapshot assertions.

Combined current-base local validation: 115 Python tests passed. The additional
Node probes retain their separate 12-case / 20-case execution evidence; those
counts must not be represented as extra Python CI tests.
