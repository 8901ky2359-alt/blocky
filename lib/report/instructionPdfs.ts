// 工番(workNo) -> 現場資料PDFのパス（Googleドライブ「指示書_リブライト」から取り込み・自前ホスティング）
// 注: ドライブ側に「指示書」という名前のファイルが無い現場が大半のため、現場地図・
// 作業範囲図など、その現場フォルダに1つだけ入っていたPDFを代わりに採用している場合がある
// （178件の工番のうち33件のみ対応・残りはフォルダが空か、ファイルが複数あり判別不能）
export const INSTRUCTION_PDFS: Record<string, string> = {
  '800095': '/instructions/1DDnAnde2lfmadV0LQRfekdJvAOH8KepU.pdf', // WEST-L-27A～C
  '800096': '/instructions/1DDnAnde2lfmadV0LQRfekdJvAOH8KepU.pdf', // WEST-L-27A～C
  '800097': '/instructions/1DDnAnde2lfmadV0LQRfekdJvAOH8KepU.pdf', // WEST-L-27A～C
  '800714': '/instructions/1iATPbn-ibm_YIloZ52nG1VdkXvtcpCK_.pdf', // WEST-L-399
  '800733': '/instructions/1g2IDZRdB6cEugTzPwar8gSvPmKgU283q.pdf', // WEST-L-41AB
  '800734': '/instructions/1g2IDZRdB6cEugTzPwar8gSvPmKgU283q.pdf', // WEST-L-41AB
  '800770': '/instructions/1PvDroNUJr7vnAkq-X0QjFpBpkplyZlOR.pdf', // WEST-L-58AB
  '800771': '/instructions/1PvDroNUJr7vnAkq-X0QjFpBpkplyZlOR.pdf', // WEST-L-58AB
  '800994': '/instructions/1MZmEYLUGyU8tQ3tHYoiloKUXakNNk9PQ.pdf', // WEST-L-479
  '801167': '/instructions/1tcEay8O5AhQwfeEK_-5HE3mZW58Ikxau.pdf', // WEST-L-620
  '801280': '/instructions/17oA20t1vg75J8EBaypl6siQPcYOr7gBW.pdf', // WEST-L-689
  '801746': '/instructions/1QCTX3dZXWukckGD3wNa2mcl12oLHNNmA.pdf', // WEST-L-1047
  '801918': '/instructions/1x8tTlOLpQnFKtizGfyYEbW0pJbIjKbMj.pdf', // WEST-L-1168
  '801988': '/instructions/1eQsEvILApVdftap4MGNNL1SymulaMUY0.pdf', // WEST-L-1218
  '802008': '/instructions/1hg0IN8GWHGkGkNIS6j6wVivDF4xpKfL5.pdf', // WEST-L-1227
  '802026': '/instructions/1kWS6hrnFWWB6a_vp63wZwvNZwPIEr5eX.pdf', // WEST-L-1237
  '802055': '/instructions/1gNGcw-HFK6vWh9pwu9FNOpJH8A_xGVSV.pdf', // WEST-L-1263
  '802066': '/instructions/1-_i3NJT581FVuEPelaItVjxTjKGMCQ9G.pdf', // WEST-L-1272
  '802148': '/instructions/1nnAGBS7fPRkUffu-MdVFuk-ccF3sxyOG.pdf', // WEST-L-1335
  '802149': '/instructions/1UoZzw-MbxBF5Y1KoHiGPTudAdk6yjXyB.pdf', // WEST-L-1330
  '802159': '/instructions/1HGpmJCuFFnHknFHQMM7MLAjkG-WC2EQN.pdf', // WEST-L-1345
  '802172': '/instructions/1uQ1DIMilC-N_P_PrY9wv3lmrPIk9_JgY.pdf', // WEST-L-1357
  '802173': '/instructions/1xGGttYgjtruezpet45Vv5TfgyqUMp2UW.pdf', // WEST-L-1358
  '802190': '/instructions/1UEML71wFse4rhhBKEmWzAF_W5AXOkN_p.pdf', // WEST-L-1375
  '802201': '/instructions/1WU7KINfNk9ZnqtUil6pr9wWr9E7hsvAC.pdf', // WEST-L-1386
  '802203': '/instructions/19heO7H2Yk51Pvvc5bsFWfxsJN9MdhtJL.pdf', // WEST-L-1390
  '802230': '/instructions/1WWeDEkOsKeWxlh-wwe8OQz66m-4IgDKX.pdf', // Lohas-1332
  '802283': '/instructions/1Ec0NbEoyG7bMsJVf8OqcZK3wV4Px_xbb.pdf', // WEST-L-1441
  '802304': '/instructions/1TIKqWn6sd6ipN7f_1PKN7RQjo5en1sl3.pdf', // WEST-L-1467
  '802316': '/instructions/1daKaxk5DyDOCdv10USKa3CV6Ev3pDawn.pdf', // Lohas-1357
  '802322': '/instructions/1fMZAHeK3-g9EIXSRYVt8sBcrb-X-f_lf.pdf', // WEST-L-1484
  '802538': '/instructions/15iSP4bC8c5yTG6kgKVqYf3MRf6t4hL-o.pdf', // WEST-L-1492
  '802637': '/instructions/1SKU-d039dJPjVghZeLVJXB_r4xI31LYl.pdf', // WEST-L-1459
};
