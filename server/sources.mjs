export const FOMC_URL='https://www.federalreserve.gov/monetarypolicy/fomc.htm';
export const CALENDAR_URL='https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm';
export const RATE_URL='https://markets.newyorkfed.org/api/rates/unsecured/effr/last/5.json';
export const METHOD_VERSION='official-text-rules-1.0';
// Identity references are official pages. Voting status is parsed anew from FOMC_URL.
export const MEMBERS=[
 ['warsh','Kevin Warsh','凯文·沃什','美联储主席','board',2],
 ['jefferson','Philip N. Jefferson','菲利普·杰斐逊','理事会副主席','board',1.5],
 ['williams','John C. Williams','约翰·威廉姆斯','纽约联储主席','newyork',1.5],
 ['bowman','Michelle W. Bowman','米歇尔·鲍曼','负责监管的副主席','board',1],
 ['barr','Michael S. Barr','迈克尔·巴尔','美联储理事','board',1],
 ['cook','Lisa D. Cook','丽莎·库克','美联储理事','board',1],
 ['powell','Jerome H. Powell','杰罗姆·鲍威尔','美联储理事','board',1],
 ['waller','Christopher J. Waller','克里斯托弗·沃勒','美联储理事','board',1],
 ['hammack','Beth M. Hammack','贝丝·哈马克','克利夫兰联储主席','cleveland',1],
 ['kashkari','Neel Kashkari','尼尔·卡什卡利','明尼阿波利斯联储主席','minneapolis',1],
 ['logan','Lorie K. Logan','洛里·洛根','达拉斯联储主席','dallas',1],
 ['paulson','Anna Paulson','安娜·保尔森','费城联储主席','philadelphia',1],
 ['collins','Susan M. Collins','苏珊·柯林斯','波士顿联储主席','boston',1],
 ['barkin','Thomas I. Barkin','托马斯·巴尔金','里士满联储主席','richmond',1],
 ['goolsbee','Austan D. Goolsbee','奥斯坦·古尔斯比','芝加哥联储主席','chicago',1],
 ['musalem','Alberto Musalem','阿尔贝托·穆萨莱姆','圣路易斯联储主席','stlouis',1],
 ['schmid','Jeffrey Schmid','杰弗里·施密德','堪萨斯城联储主席','kansascity',1],
 ['daly','Mary C. Daly','玛丽·戴利','旧金山联储主席','sanfrancisco',1],
 ['venable','Cheryl Venable','谢丽尔·维纳布尔','亚特兰大联储代理主席','atlanta',1]
].map(([id,name,zh,role,bank,weight])=>({id,name,zh,role,bank,weight}));
export const INDEXES=[
 {id:'board',name:'美联储理事会',url:'https://www.federalreserve.gov/newsevents/YEAR-speeches.htm',pattern:'/newsevents/speech/'},
 {id:'newyork',name:'纽约联储',url:'https://www.newyorkfed.org/newsevents/speeches/index.html',pattern:'/newsevents/speeches/YEAR/wil'},
 {id:'dallas',name:'达拉斯联储',url:'https://www.dallasfed.org/news/speeches/logan',pattern:'/news/speeches/logan/YEAR/'},
 {id:'boston',name:'波士顿联储',url:'https://www.bostonfed.org/news-and-events/speeches.aspx',pattern:'/news-and-events/speeches/YEAR/'},
 {id:'cleveland',name:'克利夫兰联储',url:'https://www.clevelandfed.org/president-and-ceo',discoveryUrls:['https://www.clevelandfed.org/'],pattern:'/collections/speeches/YEAR/'},
 {id:'philadelphia',name:'费城联储',url:'https://www.philadelphiafed.org/the-economy/speeches-anna-paulson',pattern:'/the-economy/monetary-policy/'},
 {id:'minneapolis',name:'明尼阿波利斯联储',url:'https://www.minneapolisfed.org/topic/monetary-policy',pattern:'/(?:speeches|article)/YEAR/'},
 {id:'richmond',name:'里士满联储',url:'https://www.richmondfed.org/press_room/speeches',pattern:'/press_room/speeches/thomas_i_barkin/YEAR/'},
 {id:'chicago',name:'芝加哥联储',url:'https://www.chicagofed.org/utilities/about-us/office-of-the-president/office-of-the-president-speaking',pattern:'/publications/speeches/YEAR/'},
 {id:'stlouis',name:'圣路易斯联储',url:'https://www.stlouisfed.org/from-the-president',pattern:'/from-the-president/remarks/YEAR/'},
 {id:'kansascity',name:'堪萨斯城联储',url:'https://www.kansascityfed.org/senior-leadership/president/',pattern:'/speeches/[^/]+/'},
 {id:'sanfrancisco',name:'旧金山联储',url:'https://www.frbsf.org/news-and-media/speeches/',discoveryUrls:['https://www.frbsf.org/news-and-media/','https://www.frbsf.org/news-and-media/events/'],pattern:'/news-and-media/(?:speeches/mary-c-daly|events)/YEAR/'},
 {id:'atlanta',name:'亚特兰大联储',url:'https://www.atlantafed.org/who-we-are/people/executive-leadership-committee/cheryl-venable',pattern:'/research-and-publications/'}
];
export const DIRECT=[
 {bank:'chicago',member:'goolsbee',url:'https://www.chicagofed.org/publications/speeches/2026/sept-21-omfif',date:'2026-09-21',title:'OMFIF Event: Monetary Policy in an Uncertain World'},
 {bank:'cleveland',member:'hammack',url:'https://www.clevelandfed.org/collections/speeches/2026/sp-20261012-trimming-the-sails-communicating-my-reaction-function',date:'2026-10-12',title:'Trimming the Sails: Communicating My Reaction Function'},
 {bank:'sanfrancisco',member:'daly',url:'https://www.frbsf.org/news-and-media/events/2026/08/mary-c-daly-esri-international-conference/',date:'2026-08-05',title:'Keynote Remarks by Mary C. Daly at the ESRI International Conference in Tokyo'}
];
export const ALLOWED_HOSTS=new Set(INDEXES.map(s=>new URL(s.url).hostname).concat(['markets.newyorkfed.org']));
