export function stanceOf(score){return score==null?'暂无评分':score<20?'明显鸽派':score<45?'偏鸽派':score<=55?'中性':score<=80?'偏鹰派':'明显鹰派'}
