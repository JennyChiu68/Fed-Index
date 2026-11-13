import reviews from '../data/policy-context-reviews.json' with {type:'json'};
export const POLICY_CONTEXT_VERSION='official-policy-context-1';
export function policyContextFor(url,paragraphs){
 const review=reviews.entries.find(r=>r.url===url&&r.sourceParagraphs===JSON.stringify(paragraphs));
 if(review)return {version:POLICY_CONTEXT_VERSION,summaryKind:'source_bound_chinese_review',reviewedAt:reviews.reviewedAt,points:review.points,meetingStart:review.meetingStart||null};
 const patterns=[/all participants supported|Committee decided/i,/Participants noted that inflation|Inflation remains/i,/Participants judged that labor market|Economic activity is expanding/i,/most participants assessed.*year end/i];
 const points=[...new Set(patterns.map(p=>paragraphs.find(t=>p.test(t))).filter(Boolean))].map(t=>t.length>360?t.slice(0,357)+'…':t);
 return {version:POLICY_CONTEXT_VERSION,summaryKind:'official_original_excerpt',points,meetingStart:null};
}
