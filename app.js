const form = document.querySelector('#analysis-form');
const responseInput = document.querySelector('#learner-response');
const referenceInput = document.querySelector('#reference-answer');
const responseCount = document.querySelector('#response-count');
const sampleButton = document.querySelector('#sample-button');
const output = document.querySelector('#analysis-output');
const emptyState = document.querySelector('#empty-state');
let selectedLens = 'general';

const samples = {
  response: 'Plants get their food from the soil because the roots absorb nutrients. Sunlight helps the plant grow, but the food is already in the ground.',
  reference: 'Plants make glucose through photosynthesis. Using light energy, they combine carbon dioxide from the air with water absorbed by the roots. The plant uses glucose as food.'
};

document.querySelectorAll('.lens-option').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelector('.lens-option.active').classList.remove('active');
    button.classList.add('active');
    selectedLens = button.dataset.lens;
  });
});

responseInput.addEventListener('input', () => {
  responseCount.textContent = `${responseInput.value.length} characters`;
});

sampleButton.addEventListener('click', () => {
  responseInput.value = samples.response;
  referenceInput.value = samples.reference;
  responseInput.dispatchEvent(new Event('input'));
  responseInput.focus();
});

function unique(items) { return [...new Set(items)]; }

function analyze(response, reference, lens) {
  const text = response.toLowerCase();
  const referenceText = reference.toLowerCase();
  const strengths = [];
  const gaps = [];
  const misconceptions = [];
  const evidence = [];
  const hasReasoning = /because|therefore|so that|which means|since|as a result/.test(text);
  const hasExample = /for example|e\.g\.|such as|like /.test(text);
  const hasUncertainty = /maybe|i think|not sure|probably|i guess/.test(text);
  const hasContradiction = /but|however|although|except/.test(text);

  if (response.length >= 90) strengths.push('Explains an idea with enough detail to inspect the thinking.');
  else gaps.push('The response is brief; ask for one more step or an example to reveal the learner\'s model.');
  if (hasReasoning) { strengths.push('Uses causal language to connect an idea to a reason.'); evidence.push('because / reasoning link'); }
  if (hasExample) { strengths.push('Attempts to ground the idea in an example.'); evidence.push('example marker'); }
  if (hasUncertainty) gaps.push('Signals uncertainty. Invite the learner to name which part feels least certain.');
  if (hasContradiction) gaps.push('Contains a turn or contrast; check whether the two ideas can both be true.');

  const rules = [
    { test: /plant|photosynth|soil|sunlight|food/, issue: /food from (the )?soil|plants eat|sunlight (is|becomes) food|roots make food/, text: 'Conflates absorbing water or minerals with making food.', evidence: 'plant nutrition signal' },
    { test: /force|motion|move|speed|weight|gravity/, issue: /force (is )?needed to keep|heavier (things )?fall faster|gravity makes things float/, text: 'May be treating force as something needed to sustain motion, rather than to change motion.', evidence: 'motion model signal' },
    { test: /fraction|percent|divide|multiply|equation|equal/, issue: /denominator|bottom number|cancel|equal(s)? .* larger|divide by zero/, text: 'May be applying a procedure without checking what the quantities represent.', evidence: 'quantity relationship signal' },
    { test: /claim|argument|author|evidence|essay|paragraph/, issue: /opinion is evidence|quote proves|always|never/, text: 'May be treating a claim or opinion as evidence without explaining its connection.', evidence: 'argument signal' }
  ];
  rules.forEach((rule) => {
    if (rule.test.test(text) && rule.issue.test(text)) { misconceptions.push(rule.text); evidence.push(rule.evidence); }
  });
  if (referenceText && referenceText.length > 25) {
    const referenceWords = unique(referenceText.match(/[a-z]{5,}/g) || []);
    const matched = referenceWords.filter((word) => text.includes(word)).length;
    if (matched >= 2) strengths.push(`Connects with ${matched} key idea${matched === 1 ? '' : 's'} from the reference.`, 'Uses subject-specific vocabulary that gives the response a clear anchor.');
    else gaps.push('Few core ideas from the reference appear in the response; prompt for the missing concept explicitly.');
  }
  if (!strengths.length) strengths.push('Makes a starting claim that gives a useful entry point for feedback.');
  if (!gaps.length) gaps.push('Ask the learner to extend the explanation with evidence, an example, or a consequence.');
  if (!misconceptions.length && hasUncertainty) misconceptions.push('No specific misconception detected; uncertainty is the clearest next signal to explore.');
  if (!misconceptions.length) misconceptions.push('No strong misconception pattern detected. Check the learner\'s explanation with a “how do you know?” follow-up.');

  let score = 48 + Math.min(24, Math.round(response.length / 16)) + (hasReasoning ? 12 : 0) + (hasExample ? 8 : 0) + (referenceText ? 4 : 0) - (misconceptions.length > 1 ? 9 : 0);
  score = Math.max(22, Math.min(94, score));
  const lensNote = lens === 'general' ? 'a general concept lens' : `a ${lens} lens`;
  return { score, strengths: unique(strengths), gaps: unique(gaps), misconceptions: unique(misconceptions), evidence: unique(evidence), lensNote };
}

function renderAnalysis(result) {
  const list = (items) => `<ul>${items.map((item) => `<li>${item}</li>`).join('')}</ul>`;
  const evidence = result.evidence.length ? result.evidence.map((item) => `<span class="tag">${item}</span>`).join('') : '<span class="tag">response-level read</span>';
  output.innerHTML = `<div class="score-row"><span class="score-title">understanding signal</span><div class="score"><strong>${result.score}</strong><small>/ 100</small></div></div>
    <p class="output-intro"><strong>Here is what stands out.</strong><br>Analyzed with ${result.lensNote}, using the learner's own evidence.</p>
    <div class="signal-block"><div class="signal-heading"><i class="strength"></i> Strengths</div>${list(result.strengths)}</div>
    <div class="signal-block"><div class="signal-heading"><i class="gap"></i> Worth exploring</div>${list(result.gaps)}</div>
    <div class="signal-block"><div class="signal-heading"><i class="misconception"></i> Possible misconception</div>${list(result.misconceptions)}<div style="margin-top:8px">${evidence}</div></div>
    <div class="next-step"><div class="signal-heading">Next teaching move</div><p>Ask: <strong>“What makes you say that, and what would be an example?”</strong> Then revisit the idea marked above before adding new content.</p></div>`;
  emptyState.classList.add('hidden');
  output.classList.remove('hidden');
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const button = form.querySelector('.analyze-button');
  button.disabled = true;
  button.querySelector('span:first-child').textContent = 'Reading the response...';
  setTimeout(() => {
    renderAnalysis(analyze(responseInput.value.trim(), referenceInput.value.trim(), selectedLens));
    button.disabled = false;
    button.querySelector('span:first-child').textContent = 'Analyze response';
  }, 500);
});