/* ==================================================================
   VIRTUAL CHEMISTRY LAB — script.js
   ==================================================================
   Table of contents:
     1.  App state
     2.  i18n dictionary + translate()
     3.  Chemicals & experiments data
     4.  DOM shortcuts
     5.  Navigation between pages
     6.  Loading screen helper
     7.  Modal helpers
     8.  Sound engine (WebAudio, no audio files needed)
     9.  Score / progress persistence (localStorage)
     10. Lab rendering (build the chemical shelf for an experiment)
     11. Adding a chemical to an apparatus (drag-drop + click fallback)
     12. Reaction engine (color / bubbles / precipitate / heat)
     13. Burner, reset, hint, safety wiring
     14. Init
   ================================================================== */

(function () {
  'use strict';

  /* ----------------------------------------------------------------
     1. APP STATE
     One place holding everything that can change at runtime.
  ---------------------------------------------------------------- */
  const state = {
    lang: localStorage.getItem('chemlab_lang') || 'en',
    soundOn: true,
    score: parseInt(localStorage.getItem('chemlab_score') || '0', 10),
    completed: JSON.parse(localStorage.getItem('chemlab_completed') || '[]'),
    currentExperimentId: null,   // id of the experiment loaded in the lab, or null (free mix)
    selectedChemical: null,      // chemical id picked via click-to-select (touch-friendly alt to drag&drop)
    apparatus: {                 // what's been added to each piece of glassware right now
      beaker:   { added: [], resolved: false },
      testTube: { added: [], resolved: false },
      flask:    { added: [], resolved: false },
    },
  };


  /* ----------------------------------------------------------------
     2. I18N DICTIONARY
     Every data-i18n key from index.html gets an EN + AR string.
     translate() walks the DOM once and swaps text content.
  ---------------------------------------------------------------- */
  const I18N = {
    en: {
      brand: 'ChemLab<em>2D</em>', loading: 'Preparing the lab…',
      nav_home: 'Home', nav_experiments: 'Experiments', nav_lab: 'Virtual Lab',
      hero_cta: '⚗️ Enter the Lab',
      stat_experiments: 'Guided experiments', stat_risk: 'Real-world risk', stat_access: 'Lab access',
      about_title: 'About the Lab',
      about_sub: 'ChemLab2D pairs every reaction with the “why” behind it, so experimenting never gets disconnected from understanding.',
      feat1_title: 'Zero-risk safety', feat1_body: 'Practice hazardous combinations and their warnings without any real danger.',
      feat2_title: 'Guided explanations', feat2_body: 'Every reaction explains what happened and why, in plain language.',
      feat3_title: 'Track your progress', feat3_body: 'Earn scores, complete experiments, and watch your progress bar fill up.',
      feat4_title: 'Bilingual interface', feat4_body: 'Switch instantly between English and Arabic, with full RTL support.',
      about_eyebrow: 'KEY FEATURES',
      exp_eyebrow: 'CHOOSE AN EXPERIMENT', exp_title: 'Experiment Selection',
      exp_sub: 'Pick a guided experiment. Each one drops you straight onto the lab bench.',
      diff_easy: 'Easy', diff_medium: 'Medium', diff_hard: 'Hard',
      exp1_name: 'Acid + Base Neutralization', exp1_desc: 'Combine hydrochloric acid and sodium hydroxide and watch the indicator change color.',
      exp2_name: 'Vinegar + Baking Soda', exp2_desc: 'A classic acid-carbonate reaction that releases carbon dioxide gas bubbles.',
      exp3_name: 'Copper Sulfate Reaction', exp3_desc: 'Add iron to copper sulfate solution and observe a precipitate form.',
      exp4_name: 'Elephant Toothpaste', exp4_desc: 'Mix hydrogen peroxide with a catalyst and watch a giant foam erupt.',
      exp5_name: 'Dry Ice Fog', exp5_desc: 'Drop dry ice into warm water and watch thick white fog billow out.',
      exp6_name: 'Glowing Luminol', exp6_desc: 'Combine luminol with an oxidizer and watch it glow blue-green.',
      completed_tag: 'Completed',
      start_btn: 'Start', back_btn: '← Back', hint_btn: '💡 Hint', reset_btn: '↺ Reset', handtrack_btn: '🖐️ Hand Control',
      lab_default_title: 'Free Mix', shelf_title: 'Chemicals',
      label_beaker: 'Beaker', label_testtube: 'Test Tube', label_flask: 'Flask',
      panel_messages: 'Lab Messages', msg_welcome: 'Drag (or tap) a chemical bottle, then tap a piece of glassware to add it.',
      panel_score: 'Score & Progress', score_label: 'Score', completed_label: 'Completed',
      safety_title: '🧪 Lab Safety Instructions',
      safety1: 'Always add acid to water, never water to acid.',
      safety2: 'Never mix bleach-type and ammonia-type chemicals.',
      safety3: "Watch for temperature warnings — step away from exothermic reactions.",
      safety4: 'Wear goggles and gloves in a real laboratory at all times.',
      safety5: "This simulator blocks unsafe combinations so you can learn why they're dangerous.",
      got_it_btn: 'Got it', hint_title: '💡 Hint', hint_default: 'Select an experiment first to get a tailored hint.',
      close_btn: 'Close', result_default_title: 'Result', try_again_btn: 'Try Again', next_btn: 'Next Experiment',
      footer_text: 'ChemLab2D — a safe space to think like a chemist.',
      msg_added: (chem) => `Added ${chem} to the glassware.`,
      msg_already: 'That chemical is already in there — add a different one to react.',
      msg_wrong_start: 'Combination result: ',
      full_note: 'This piece of glassware already has a result — press Reset to try again.',
      // Class Competition Mode
      mode_title: 'How do you want to use the Lab?',
      mode_solo_title: 'Solo Exploration', mode_solo_desc: 'Learn at your own pace',
      mode_free_title: 'Free Lab', mode_free_desc: 'Mix & discover with AI',
      mode_class_title: 'Class Competition', mode_class_desc: 'Team challenge with friends',
      class_mode_title: 'Class Competition Mode',
      teacher_role: 'Teacher/Leader', teacher_role_desc: 'Create & monitor competition',
      student_role: 'Student/Participant', student_role_desc: 'Join with code & compete',
      teacher_title: 'Create a Class Competition',
      teacher_select_exp: 'Select Experiments:',
      teacher_create: 'Create Competition',
      teacher_share_code: 'Share this code with students:',
      teacher_students: 'Students & Results',
      teacher_end: 'End Competition',
      student_title: 'Join a Class Competition',
      student_enter_code: 'Enter Competition Code:',
      student_enter_name: 'Your Name:',
      student_join: 'Join Competition',
      msg_select_exp: 'Please select at least one experiment',
      msg_fill_fields: 'Please fill in both fields',
      msg_invalid_code: 'Invalid competition code',
      msg_confirm_end: 'End this competition?',
      // Free Mode
      free_title: 'Free Chemistry Lab',
      free_desc: 'Mix any chemicals and discover reactions with AI predictions',
      free_choose_vessel: 'Choose Your Vessel',
      free_select_chemicals: 'Select Chemicals (in mL)',
      free_mix_btn: '🧬 Mix & Discover',
      free_analyzing: 'Analyzing reaction...',
      free_history: 'Reaction History',
      free_no_history: 'No reactions yet',
    },
    ar: {
      brand: 'مختبر<em>الكيمياء</em>', loading: 'جاري تجهيز المختبر…',
      nav_home: 'الرئيسية', nav_experiments: 'التجارب', nav_lab: 'المختبر الافتراضي',
      hero_cta: '⚗️ ادخل المختبر',
      stat_experiments: 'تجارب موجّهة', stat_risk: 'مخاطر واقعية', stat_access: 'إتاحة المختبر',
      about_title: 'عن المختبر',
      about_sub: 'يربط مختبر الكيمياء كل تفاعل بسبب حدوثه، حتى لا تنفصل التجربة عن الفهم أبدًا.',
      feat1_title: 'أمان بلا مخاطر', feat1_body: 'جرّب التركيبات الخطرة وتحذيراتها دون أي خطر حقيقي.',
      feat2_title: 'تفسيرات موجّهة', feat2_body: 'كل تفاعل يُشرح لك ماذا حدث ولماذا، بلغة بسيطة.',
      feat3_title: 'تتبّع تقدّمك', feat3_body: 'اجمع النقاط، أكمل التجارب، وشاهد شريط تقدّمك يمتلئ.',
      feat4_title: 'واجهة ثنائية اللغة', feat4_body: 'بدّل فورًا بين الإنجليزية والعربية مع دعم كامل للاتجاه من اليمين لليسار.',
      about_eyebrow: 'المميزات الرئيسية',
      exp_eyebrow: 'اختر تجربة', exp_title: 'اختيار التجربة',
      exp_sub: 'اختر تجربة موجّهة، وستنتقل مباشرة إلى منضدة المختبر.',
      diff_easy: 'سهل', diff_medium: 'متوسط', diff_hard: 'صعب',
      exp1_name: 'تعادل حمض وقاعدة', exp1_desc: 'امزج حمض الهيدروكلوريك مع هيدروكسيد الصوديوم وشاهد تغيّر لون الكاشف.',
      exp2_name: 'الخل وبيكربونات الصوديوم', exp2_desc: 'تفاعل كلاسيكي بين حمض وكربونات يُطلق فقاعات غاز ثاني أكسيد الكربون.',
      exp3_name: 'تفاعل كبريتات النحاس', exp3_desc: 'أضف الحديد إلى محلول كبريتات النحاس وشاهد تكوّن راسب.',
      exp4_name: 'معجون أسنان الفيل', exp4_desc: 'امزج بيروكسيد الهيدروجين مع عامل حفّاز وشاهد رغوة ضخمة تنفجر.',
      exp5_name: 'ضباب الثلج الجاف', exp5_desc: 'أسقط الثلج الجاف في ماء دافئ وشاهد ضبابًا أبيض كثيفًا يتصاعد.',
      exp6_name: 'اللومينول المتوهج', exp6_desc: 'امزج اللومينول مع مؤكسد وشاهده يتوهج بلون أزرق مخضر.',
      completed_tag: 'مكتملة',
      start_btn: 'ابدأ', back_btn: '→ رجوع', hint_btn: '💡 تلميح', reset_btn: '↺ إعادة ضبط', handtrack_btn: '🖐️ تحكم باليد',
      lab_default_title: 'مزج حر', shelf_title: 'المواد الكيميائية',
      label_beaker: 'كأس زجاجي', label_testtube: 'أنبوب اختبار', label_flask: 'دورق',
      panel_messages: 'رسائل المختبر', msg_welcome: 'اسحب (أو اضغط على) زجاجة مادة كيميائية، ثم اضغط على أداة زجاجية لإضافتها.',
      panel_score: 'النقاط والتقدّم', score_label: 'النقاط', completed_label: 'المكتمل',
      safety_title: '🧪 تعليمات السلامة في المختبر',
      safety1: 'أضف الحمض دائمًا إلى الماء، ولا تفعل العكس أبدًا.',
      safety2: 'لا تمزج أبدًا مواد كلورية مع مواد أمونيا.',
      safety3: 'انتبه لتحذيرات الحرارة — ابتعد عن التفاعلات الطاردة للحرارة.',
      safety4: 'ارتدِ النظارات والقفازات دائمًا في المختبر الحقيقي.',
      safety5: 'هذا المحاكي يمنع التركيبات غير الآمنة لتتعلم لماذا هي خطرة.',
      got_it_btn: 'حسنًا', hint_title: '💡 تلميح', hint_default: 'اختر تجربة أولًا للحصول على تلميح مخصص.',
      close_btn: 'إغلاق', result_default_title: 'النتيجة', try_again_btn: 'حاول مجددًا', next_btn: 'التجربة التالية',
      footer_text: 'مختبر الكيمياء الافتراضي — مساحة آمنة للتفكير كعالم كيمياء.',
      msg_added: (chem) => `تمت إضافة ${chem} إلى الأداة الزجاجية.`,
      msg_already: 'هذه المادة موجودة بالفعل — أضف مادة مختلفة لحدوث تفاعل.',
      msg_wrong_start: 'نتيجة التركيبة: ',
      full_note: 'هذه الأداة الزجاجية تحتوي على نتيجة بالفعل — اضغط "إعادة ضبط" للمحاولة مجددًا.',
      // Class Competition Mode
      mode_title: 'كيف تريد استخدام المختبر؟',
      mode_solo_title: 'استكشاف فردي', mode_solo_desc: 'تعلّم بوتيرتك الخاصة',
      mode_free_title: 'مختبر حر', mode_free_desc: 'اخلط واكتشف مع الذكاء الاصطناعي',
      mode_class_title: 'مسابقة فصل', mode_class_desc: 'تحدّ مع الأصدقاء',
      class_mode_title: 'وضع مسابقة الفصل',
      teacher_role: 'معلم / قائد', teacher_role_desc: 'إنشاء ومراقبة المسابقة',
      student_role: 'طالب / مشارك', student_role_desc: 'ادخل برمز والمع',
      teacher_title: 'إنشاء مسابقة فصل',
      teacher_select_exp: 'اختر التجارب:',
      teacher_create: 'إنشاء مسابقة',
      teacher_share_code: 'شارك هذا الرمز مع الطلاب:',
      teacher_students: 'الطلاب والنتائج',
      teacher_end: 'إنهاء المسابقة',
      student_title: 'ادخل مسابقة فصل',
      student_enter_code: 'أدخل رمز المسابقة:',
      student_enter_name: 'اسمك:',
      student_join: 'ادخل المسابقة',
      msg_select_exp: 'يرجى اختيار تجربة واحدة على الأقل',
      msg_fill_fields: 'يرجى ملء كلا الحقلين',
      msg_invalid_code: 'رمز مسابقة غير صحيح',
      msg_confirm_end: 'إنهاء هذه المسابقة؟',
      // Free Mode
      free_title: 'مختبر الكيمياء الحر',
      free_desc: 'اخلط أي كيميائيات واكتشف التفاعلات مع توقعات الذكاء الاصطناعي',
      free_choose_vessel: 'اختر الأداة الزجاجية',
      free_select_chemicals: 'اختر المواد الكيميائية (بالملليتر)',
      free_mix_btn: '🧬 اخلط واكتشف',
      free_analyzing: 'تحليل التفاعل...',
      free_history: 'سجل التفاعلات',
      free_no_history: 'لا توجد تفاعلات حتى الآن',
      // Free Mode - Elements & Apparatus
      select_apparatus: 'اختر الأنبوب:',
      lab_free_description: 'اخلط العناصر لاكتشاف تفاعلات جديدة!',
      msg_welcome_free: 'اسحب عنصرًا من الرف واضغط على الأنبوب المختار لإضافته.',
      msg_free_no_reaction: 'لا يوجد تفاعل — جرّب عناصر مختلفة!',
    },
  };

  // === TRANSLATE PREVIOUS "en:" ENTRIES TO ADD NEW KEYS ===
  I18N.en.select_apparatus = 'Choose Container:';
  I18N.en.lab_free_description = 'Mix elements to see what happens!';
  I18N.en.msg_welcome_free = 'Drag an element onto the selected container to begin.';
  I18N.en.msg_free_no_reaction = 'No reaction — try different elements!';

  /** Translate every [data-i18n] element + set <html lang/dir>. */
  function applyTranslations() {
    const dict = I18N[state.lang];
    document.documentElement.lang = state.lang;
    document.documentElement.dir = state.lang === 'ar' ? 'rtl' : 'ltr';
    document.getElementById('langLabel').textContent = state.lang === 'ar' ? 'EN' : 'AR';

    // The hero banner image has its English title baked in; swap in a glowing
    // Arabic overlay on top of it instead of trying to translate the image.
    const heroArTitle = document.getElementById('heroArTitle');
    if (heroArTitle) heroArTitle.hidden = state.lang !== 'ar';
    
    // Change hero image based on language
    const heroBannerImgEn = document.getElementById('heroBannerImgEn');
    const heroBannerImgAr = document.getElementById('heroBannerImgAr');
    if (state.lang === 'ar') {
      if (heroBannerImgEn) heroBannerImgEn.hidden = true;
      if (heroBannerImgAr) heroBannerImgAr.removeAttribute('hidden');
    } else {
      if (heroBannerImgEn) heroBannerImgEn.hidden = false;
      if (heroBannerImgAr) heroBannerImgAr.setAttribute('hidden', '');
    }

    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      const value = dict[key];
      if (typeof value !== 'string') return;
      // A couple of strings legitimately contain markup (e.g. the <span> in hero_title).
      if (value.includes('<')) el.innerHTML = value;
      else el.textContent = value;
    });

    // Re-render dynamic bits that depend on language (shelf labels, lab title, hint text).
    if (state.currentExperimentId) renderExperimentInLab(state.currentExperimentId, { keepState: true });
    updateScoreUI();
  }


  /* ----------------------------------------------------------------
     3. CHEMICALS & EXPERIMENTS DATA
     Central source of truth — edit here to add/change experiments.
  ---------------------------------------------------------------- */
  const CHEMICALS = {
    // === PRIMARY ELEMENTS FOR FREE MODE ===
    hydrogen: {
      name: { en: 'Hydrogen', ar: 'الهيدروجين' }, formula: 'H', bottleColor: '#60a5fa',
      short: { en: 'H', ar: 'H' },
      info: { en: 'Colorless gas — the lightest element. Combines with oxygen to form water.', ar: 'غاز عديم اللون — أخف العناصر. يتحد مع الأكسجين لتكوين الماء.' },
    },
    oxygen: {
      name: { en: 'Oxygen', ar: 'الأكسجين' }, formula: 'O', bottleColor: '#34d399',
      short: { en: 'O', ar: 'O' },
      info: { en: 'Colorless gas — supports combustion. Essential for water and many compounds.', ar: 'غاز عديم اللون — يدعم الاحتراق. ضروري للماء والعديد من المركبات.' },
    },
    carbon: {
      name: { en: 'Carbon', ar: 'الكربون' }, formula: 'C', bottleColor: '#1f2937',
      short: { en: 'C', ar: 'C' },
      info: { en: 'Dark solid — basis of all organic molecules. Forms the backbone of life.', ar: 'مادة صلبة داكنة — أساس جميع الجزيئات العضوية. تشكل عمود الحياة.' },
    },
    nitrogen: {
      name: { en: 'Nitrogen', ar: 'النيتروجين' }, formula: 'N', bottleColor: '#8b5cf6',
      short: { en: 'N', ar: 'N' },
      info: { en: 'Colorless gas — makes up 78% of air. Essential for proteins and DNA.', ar: 'غاز عديم اللون — يشكل 78% من الهواء. ضروري للبروتينات والحمض النووي.' },
    },
    sodium: {
      name: { en: 'Sodium', ar: 'الصوديوم' }, formula: 'Na', bottleColor: '#fbbf24',
      short: { en: 'Na', ar: 'Na' },
      info: { en: 'Silver metal — highly reactive, stored in oil. Essential for nerve signals.', ar: 'معدن فضي — نشط جداً، يُخزن في الزيت. ضروري لإشارات الأعصاب.' },
    },
    chlorine: {
      name: { en: 'Chlorine', ar: 'الكلور' }, formula: 'Cl', bottleColor: '#f472b6',
      short: { en: 'Cl', ar: 'Cl' },
      info: { en: 'Yellow-green toxic gas — used to disinfect water. Forms salts with metals.', ar: 'غاز سام أصفر-أخضر — يُستخدم لتطهير الماء. يكون ملاح مع المعادن.' },
    },

    // === LEGACY CHEMICALS FOR GUIDED EXPERIMENTS (kept for compatibility) ===    // === NEW CHEMICALS FOR 10 EXPERIMENTS ===
    sulfur: {
      name: { en: 'Sulfur Powder', ar: 'مسحوق الكبريت' }, formula: 'S', bottleColor: '#eab308',
      short: { en: 'Non-metal', ar: 'لافلز' },
      info: { en: 'Yellow sulfur powder — when heated with iron, forms black iron sulfide.', ar: 'مسحوق كبريت أصفر — عند تسخينه مع الحديد، يكوّن كبريتيد الحديد الأسود.' },
    },
    zinc: {
      name: { en: 'Zinc Powder', ar: 'مسحوق الزنك' }, formula: 'Zn', bottleColor: '#c0cfe4',
      short: { en: 'Metal', ar: 'معدن' },
      info: { en: 'More reactive than copper — displaces copper from copper sulfate solution.', ar: 'أكثر تفاعلاً من النحاس — يزيح النحاس من محلول كبريتات النحاس.' },
    },
    sodium: {
      name: { en: 'Sodium Metal', ar: 'معدن الصوديوم' }, formula: 'Na', bottleColor: '#d4af37',
      short: { en: 'Alkali metal', ar: 'معدن قلوي' },
      info: { en: 'Highly reactive — reacts violently with water, igniting the hydrogen gas produced.', ar: 'شديد التفاعل — يتفاعل بعنف مع الماء، مشعلاً غاز الهيدروجين الناتج.' },
    },
    water: {
      name: { en: 'Water', ar: 'الماء' }, formula: 'H₂O', bottleColor: '#7dd3fc',
      short: { en: 'Solvent', ar: 'مذيب' },
      info: { en: 'Universal solvent — participates in hydrolysis and combustion reactions.', ar: 'المذيب الشامل — يشارك في تفاعلات التحلل المائي والاحتراق.' },
    },
    calcium: {
      name: { en: 'Calcium Metal', ar: 'معدن الكالسيوم' }, formula: 'Ca', bottleColor: '#d1d5db',
      short: { en: 'Alkaline metal', ar: 'معدن قلوي أرضي' },
      info: { en: 'Less reactive than sodium — reacts slowly with water to form calcium hydroxide and hydrogen gas.', ar: 'أقل تفاعلاً من الصوديوم — يتفاعل ببطء مع الماء لتكوين هيدروكسيد الكالسيوم وغاز الهيدروجين.' },
    },
    copper: {
      name: { en: 'Copper Metal', ar: 'معدن النحاس' }, formula: 'Cu', bottleColor: '#ea8e4f',
      short: { en: 'Transition metal', ar: 'معدن انتقالي' },
      info: { en: 'Dissolves in dilute nitric acid, producing brown NO₂ gas. Doesn\'t react with dilute HCl or H₂SO₄.', ar: 'ينحل في حمض النيتريك المخفف، منتجًا غاز NO₂ بني. لا يتفاعل مع حمض HCl أو H₂SO₄ المخفف.' },
    },
    nitric_acid: {
      name: { en: 'Nitric Acid', ar: 'حمض النيتريك' }, formula: 'HNO₃', bottleColor: '#fbbf24',
      short: { en: 'Strong oxidizing acid', ar: 'حمض قوي مؤكسد' },
      info: { en: 'Powerful oxidizer — reacts with most metals, producing toxic brown NO₂ gas.', ar: 'مؤكسد قوي — يتفاعل مع معظم المعادن، منتجًا غاز NO₂ سام بني.' },
    },
    lead_nitrate: {
      name: { en: 'Lead Nitrate', ar: 'نترات الرصاص' }, formula: 'Pb(NO₃)₂', bottleColor: '#e5e7eb',
      short: { en: 'Metal salt', ar: 'ملح معدني' },
      info: { en: 'Colorless solution — forms bright yellow precipitate with iodide ions.', ar: 'محلول عديم اللون — يكون راسب أصفر ساطع مع أيونات اليوديد.' },
    },
    sodium_chloride: {
      name: { en: 'Sodium Chloride', ar: 'كلوريد الصوديوم' }, formula: 'NaCl', bottleColor: '#f3f4f6',
      short: { en: 'Salt', ar: 'ملح' },
      info: { en: 'Table salt — doesn\'t form colored precipitates with most metal ions.', ar: 'ملح الطعام — لا يكوّن رواسب ملونة مع معظم أيونات المعادن.' },
    },
    starch: {
      name: { en: 'Starch Solution', ar: 'محلول النشا' }, formula: '(C₆H₁₀O₅)ₙ', bottleColor: '#fef3c7',
      short: { en: 'Polymer', ar: 'بوليمر' },
      info: { en: 'Turns deep blue-black with iodine due to the formation of a starch-iodine complex.', ar: 'يتحول إلى أزرق-أسود عميق مع اليود بسبب تكوين معقد النشا-اليود.' },
    },
    iodine: {
      name: { en: 'Iodine', ar: 'اليود' }, formula: 'I₂', bottleColor: '#92400e',
      short: { en: 'Halogen', ar: 'الهالوجين' },
      info: { en: 'Forms a striking blue-black complex with starch — a classic test for starch in food.', ar: 'يكوّن معقد أزرق-أسود مميز مع النشا — اختبار كلاسيكي للكشف عن النشا في الغذاء.' },
    },
    glucose: {
      name: { en: 'Glucose Solution', ar: 'محلول الجلوكوز' }, formula: 'C₆H₁₂O₆', bottleColor: '#fcd34d',
      short: { en: 'Sugar', ar: 'سكر' },
      info: { en: 'A reducing sugar — doesn\'t turn blue-black with iodine like starch does.', ar: 'سكر مختزل — لا يتحول إلى أزرق-أسود مع اليود مثل النشا.' },
    },
    manganese_dioxide: {
      name: { en: 'Manganese Dioxide', ar: 'ثاني أكسيد المنجنيز' }, formula: 'MnO₂', bottleColor: '#5b5b5b',
      short: { en: 'Catalyst', ar: 'عامل حفّاز' },
      info: { en: 'A powerful catalyst — speeds up H₂O₂ decomposition without being consumed.', ar: 'عامل حفّاز قوي — يسرّع تحلل H₂O₂ دون أن يُستهلك.' },
    },
    iron_oxide: {
      name: { en: 'Iron Oxide Powder', ar: 'مسحوق أكسيد الحديد' }, formula: 'Fe₂O₃/Fe₃O₄', bottleColor: '#7c2d12',
      short: { en: 'Metal oxide', ar: 'أكسيد معدني' },
      info: { en: 'Doesn\'t effectively catalyze H₂O₂ decomposition — use MnO₂ instead.', ar: 'لا يحفز بفعالية تحلل H₂O₂ — استخدم MnO₂ بدلاً من ذلك.' },
    },
    sugar: {
      name: { en: 'Sugar (Sucrose)', ar: 'السكر (السكروز)' }, formula: 'C₁₂H₂₂O₁₁', bottleColor: '#fef08a',
      short: { en: 'Organic compound', ar: 'مركب عضوي' },
      info: { en: 'When dehydrated by conc. H₂SO₄, it blackens into pure carbon — a dramatic exothermic reaction.', ar: 'عند جفافه بـ H₂SO₄ المركز، يتحول إلى كربون نقي أسود — تفاعل طارد حرارة درامي.' },
    },
    sulfuric_acid: {
      name: { en: 'Sulfuric Acid', ar: 'حمض الكبريتيك' }, formula: 'H₂SO₄', bottleColor: '#fed7aa',
      short: { en: 'Strong dehydrating acid', ar: 'حمض قوي مجفف' },
      info: { en: 'A powerful dehydrating agent — removes water from organic compounds, leaving carbon behind.', ar: 'عامل جفاف قوي — يزيل الماء من المركبات العضوية، تاركًا الكربون.' },
    },
    hydrochloric_acid: {
      name: { en: 'Hydrochloric Acid', ar: 'حمض الهيدروكلوريك' }, formula: 'HCl', bottleColor: '#fca5a5',
      short: { en: 'Strong acid', ar: 'حمض قوي' },
      info: { en: 'A strong acid — doesn\'t dehydrate sugar or react as vigorously as HNO₃ with metals.', ar: 'حمض قوي — لا يجفف السكر أو يتفاعل بعنف مثل HNO₃ مع المعادن.' },
    },
    aluminum: {
      name: { en: 'Aluminum Powder', ar: 'مسحوق الألومنيوم' }, formula: 'Al', bottleColor: '#e5e7eb',
      short: { en: 'Amphoteric metal', ar: 'معدن برمائي' },
      info: { en: 'Reacts with both acids AND strong bases — amphoteric. Reacts vigorously with NaOH + water.', ar: 'يتفاعل مع الحمضيات والقواعد القوية — برمائي. يتفاعل بعنف مع NaOH والماء.' },
    },
  };

  // === FREE MODE ELEMENT REACTIONS ===
  const FREE_REACTIONS = [
    {
      name: { en: 'Water Formation', ar: 'تكوين الماء' },
      needed: ['hydrogen', 'oxygen'],
      result: { color: 'color-cyan', text: { en: '✨ H + O → H₂O (Water)', ar: '✨ H + O → H₂O (ماء)' } },
      heat: false,
      precipitate: false,
      bubbles: true
    },
    {
      name: { en: 'Organic Compound', ar: 'مركب عضوي' },
      needed: ['carbon', 'hydrogen', 'oxygen'],
      result: { color: 'color-green', text: { en: '🟢 C + H + O → Organic Compound', ar: '🟢 C + H + O → مركب عضوي' } },
      heat: false,
      precipitate: false,
      bubbles: false
    },
    {
      name: { en: 'Nitrogen Compound', ar: 'مركب نيتروجيني' },
      needed: ['nitrogen', 'hydrogen'],
      result: { color: 'color-purple', text: { en: '💜 N + H → Nitrogen Compound', ar: '💜 N + H → مركب نيتروجيني' } },
      heat: false,
      precipitate: false,
      bubbles: true
    },
    {
      name: { en: 'Sodium Chloride (Salt)', ar: 'كلوريد الصوديوم (ملح)' },
      needed: ['sodium', 'chlorine'],
      result: { color: 'color-yellow', text: { en: '⚪ Na + Cl → NaCl (Table Salt)', ar: '⚪ Na + Cl → NaCl (ملح الطعام)' } },
      heat: true,
      precipitate: true,
      bubbles: false
    },
    {
      name: { en: 'Carbon Dioxide', ar: 'ثاني أكسيد الكربون' },
      needed: ['carbon', 'oxygen'],
      result: { color: 'color-gray', text: { en: '⚫ C + O → CO₂ (Carbon Dioxide)', ar: '⚫ C + O → CO₂ (ثاني أكسيد الكربون)' } },
      heat: false,
      precipitate: false,
      bubbles: true
    }
  ];

  const EXPERIMENTS = {
    neutralization: {
      id: 'neutralization', difficulty: 'easy',
      name: { en: 'Acid + Base Neutralization', ar: 'تعادل حمض وقاعدة' },
      chemicals: ['hcl', 'naoh'],       // the two required chemicals (order doesn't matter)
      distractor: 'copper_sulfate',     // an extra bottle to test "prevent incorrect combinations"
      apparatusNeeded: ['beaker', 'burner'], // only these show on the bench for this experiment
      effects: { color: 'color-pink', heat: true, bubbles: false, precipitate: false },
      successMsg: { en: 'Neutralization complete — the indicator turned pink!', ar: 'اكتمل التعادل — تحوّل الكاشف إلى اللون الوردي!' },
      explanation: {
        en: 'HCl and NaOH react to form water and table salt (NaCl). This is exothermic, which is why you saw a temperature warning.',
        ar: 'يتفاعل حمض الهيدروكلوريك مع هيدروكسيد الصوديوم لتكوين الماء وملح الطعام. التفاعل طارد للحرارة، ولهذا ظهر تحذير الحرارة.',
      },
      hint: { en: 'You need an acid and a base. Try the two clear bottles — not the blue one.', ar: 'تحتاج إلى حمض وقاعدة. جرّب الزجاجتين الشفافتين، وليس الزرقاء.' },
      wrongMsg: { en: "Copper sulfate doesn't neutralize an acid or base — nothing happens.", ar: 'كبريتات النحاس لا تُعادل حمضًا أو قاعدة — لا يحدث شيء.' },
    },
    'vinegar-soda': {
      id: 'vinegar-soda', difficulty: 'easy',
      name: { en: 'Vinegar + Baking Soda', ar: 'الخل وبيكربونات الصوديوم' },
      chemicals: ['vinegar', 'baking_soda'],
      distractor: 'naoh',
      apparatusNeeded: ['flask'],
      effects: { color: 'color-clear', heat: false, bubbles: true, precipitate: false },
      successMsg: { en: "It's fizzing! Carbon dioxide gas is being released.", ar: 'إنه يفور! يتم إطلاق غاز ثاني أكسيد الكربون.' },
      explanation: {
        en: 'Acetic acid (vinegar) reacts with sodium bicarbonate to release CO₂ gas — those are the bubbles rising to the surface.',
        ar: 'يتفاعل حمض الأسيتيك (الخل) مع بيكربونات الصوديوم لإطلاق غاز ثاني أكسيد الكربون — وهذه هي الفقاعات الصاعدة.',
      },
      hint: { en: 'Grab the vinegar and the baking soda solution — skip the sodium hydroxide.', ar: 'استخدم الخل ومحلول بيكربونات الصوديوم، وتجاهل هيدروكسيد الصوديوم.' },
      wrongMsg: { en: 'Sodium hydroxide with vinegar just neutralizes quietly — no fizz here.', ar: 'هيدروكسيد الصوديوم مع الخل يُعادل بهدوء فقط — لا يوجد فوران هنا.' },
    },
    'copper-sulfate': {
      id: 'copper-sulfate', difficulty: 'medium',
      name: { en: 'Copper Sulfate Reaction', ar: 'تفاعل كبريتات النحاس' },
      chemicals: ['copper_sulfate', 'iron'],
      distractor: 'vinegar',
      apparatusNeeded: ['testTube'],
      effects: { color: 'color-green', heat: false, bubbles: false, precipitate: true },
      successMsg: { en: 'A reddish-brown precipitate is forming as the blue color fades.', ar: 'يتكوّن راسب بنّي محمر بينما يتلاشى اللون الأزرق.' },
      explanation: {
        en: 'Iron displaces copper from the solution (a single displacement reaction), depositing solid copper and leaving pale iron sulfate behind.',
        ar: 'يزيح الحديد النحاس من المحلول (تفاعل إحلال أحادي)، مترسبًا نحاسًا صلبًا ومكوّنًا كبريتات حديد باهتة اللون.',
      },
      hint: { en: 'Iron filings dropped into the blue solution will do the trick.', ar: 'إسقاط برادة الحديد في المحلول الأزرق سيحقق التفاعل.' },
      wrongMsg: { en: "Vinegar doesn't react with copper sulfate this way — no visible change.", ar: 'الخل لا يتفاعل مع كبريتات النحاس بهذه الطريقة — لا يوجد تغيّر ملحوظ.' },
    },
    'elephant-toothpaste': {
      id: 'elephant-toothpaste', difficulty: 'medium',
      name: { en: 'Elephant Toothpaste', ar: 'معجون أسنان الفيل' },
      chemicals: ['hydrogen_peroxide', 'potassium_iodide'],
      distractor: 'vinegar',
      apparatusNeeded: ['flask'],
      effects: { color: 'color-amber', heat: false, bubbles: false, precipitate: false, foam: true },
      successMsg: { en: 'Foam is erupting out of the flask!', ar: 'الرغوة تنفجر خارج الدورق!' },
      explanation: {
        en: 'Potassium iodide rapidly breaks down the hydrogen peroxide, releasing oxygen gas so fast it whips the solution into a giant foam.',
        ar: 'يوديد البوتاسيوم يحلل بيروكسيد الهيدروجين بسرعة، مطلقًا غاز الأكسجين بسرعة كبيرة تحوّل المحلول إلى رغوة ضخمة.',
      },
      hint: { en: 'Hydrogen peroxide needs a catalyst to erupt — skip the vinegar.', ar: 'بيروكسيد الهيدروجين يحتاج عامل حفّاز لينفجر — تجاهل الخل.' },
      wrongMsg: { en: "Vinegar doesn't catalyze peroxide breakdown — no eruption.", ar: 'الخل لا يحفّز تحلل البيروكسيد — لا يوجد انفجار.' },
    },
    'dry-ice-fog': {
      id: 'dry-ice-fog', difficulty: 'easy',
      name: { en: 'Dry Ice Fog', ar: 'ضباب الثلج الجاف' },
      chemicals: ['dry_ice', 'warm_water'],
      distractor: 'baking_soda',
      apparatusNeeded: ['beaker'],
      effects: { color: 'color-clear', heat: false, bubbles: false, precipitate: false, vapor: true },
      successMsg: { en: 'Thick white fog is billowing out of the beaker!', ar: 'ضباب أبيض كثيف يتصاعد من الكأس!' },
      explanation: {
        en: 'Dry ice sublimates straight from solid to gas. Warm water speeds this up, and the cold CO₂ condenses moisture in the air into visible fog.',
        ar: 'يتسامى الثلج الجاف من صلب إلى غاز مباشرة. الماء الدافئ يسرّع هذا التسامي، وثاني أكسيد الكربون البارد يكثّف رطوبة الهواء إلى ضباب مرئي.',
      },
      hint: { en: 'Dry ice needs warm water to fog up fast — skip the baking soda.', ar: 'الثلج الجاف يحتاج ماءً دافئًا ليتصاعد الضباب بسرعة — تجاهل بيكربونات الصوديوم.' },
      wrongMsg: { en: "Baking soda doesn't speed up sublimation — barely any fog.", ar: 'بيكربونات الصوديوم لا تسرّع التسامي — لا يوجد ضباب يُذكر.' },
    },
    'glowing-luminol': {
      id: 'glowing-luminol', difficulty: 'hard',
      name: { en: 'Glowing Luminol', ar: 'اللومينول المتوهج' },
      chemicals: ['luminol', 'hydrogen_peroxide'],
      distractor: 'iron',
      apparatusNeeded: ['testTube'],
      effects: { color: 'color-green', heat: false, bubbles: false, precipitate: false, glow: true },
      successMsg: { en: 'The solution is glowing blue-green!', ar: 'المحلول يتوهج بلون أزرق مخضر!' },
      explanation: {
        en: 'Oxidizing luminol releases energy as light instead of heat — this "chemiluminescence" is the same glow forensic teams use to find trace blood.',
        ar: 'أكسدة اللومينول تُطلق الطاقة على شكل ضوء بدلًا من حرارة — هذا "التوهج الكيميائي" هو نفسه الذي تستخدمه الفرق الجنائية للعثور على آثار الدم.',
      },
      hint: { en: "Luminol needs an oxidizer to glow — the iron filings won't do it.", ar: 'اللومينول يحتاج مؤكسدًا ليتوهج — برادة الحديد لن تفعل ذلك.' },
      wrongMsg: { en: "Iron doesn't oxidize luminol this way — no glow.", ar: 'الحديد لا يؤكسد اللومينول بهذه الطريقة — لا يوجد توهج.' },
    },

    // === NEW 10 EXPERIMENTS ===
    'iron-sulfur': {
      id: 'iron-sulfur', difficulty: 'medium',
      name: { en: 'Iron + Sulfur (Exothermic)', ar: 'الحديد والكبريت (طارد للحرارة)' },
      chemicals: ['iron', 'sulfur'],
      distractor: 'zinc',
      apparatusNeeded: ['testTube', 'burner'],
      effects: { color: 'color-colorless', heat: true, bubbles: false, precipitate: false },
      successMsg: { en: 'Black iron sulfide forms — the test tube is hot!', ar: 'تتكوّن كبريتيد الحديد الأسود — الأنبوب ساخن!' },
      explanation: {
        en: 'When heated, iron and sulfur combine directly to form iron sulfide (FeS), a black solid. This is a synthesis reaction that releases significant heat.',
        ar: 'عند التسخين، يتحد الحديد والكبريت مباشرة لتكوين كبريتيد الحديد (FeS)، وهو صلب أسود. هذا تفاعل تركيبي يطلق حرارة كبيرة.',
      },
      hint: { en: "Heat iron and sulfur powder together — zinc won't react the same way.", ar: 'سخّن مسحوق الحديد والكبريت معًا — الزنك لن يتفاعل بنفس الطريقة.' },
      wrongMsg: { en: "Zinc and sulfur don't combine readily at this temperature.", ar: 'الزنك والكبريت لا يتحدان بسهولة عند هذه درجة الحرارة.' },
    },

    'sodium-water': {
      id: 'sodium-water', difficulty: 'hard',
      name: { en: 'Sodium + Water (Vigorous)', ar: 'الصوديوم والماء (عنيف)' },
      chemicals: ['sodium', 'water'],
      distractor: 'potassium',
      apparatusNeeded: ['beaker'],
      effects: { color: 'color-pink', heat: true, bubbles: true, foam: true },
      successMsg: { en: 'Sodium skitters across the water, bursting into flames!', ar: 'الصوديوم ينزلق عبر الماء، منفجرًا في اللهب!' },
      explanation: {
        en: "Sodium reacts violently with water: 2Na + 2H₂O → 2NaOH + H₂↑. The reaction is so exothermic it ignites the hydrogen gas. Never do this with potassium—it's even more dangerous!",
        ar: 'يتفاعل الصوديوم بشدة مع الماء: 2Na + 2H₂O → 2NaOH + H₂↑. التفاعل طارد للحرارة جدًا يشعل غاز الهيدروجين. لا تحاول هذا مع البوتاسيوم—فهو أخطر بكثير!',
      },
      hint: { en: 'Sodium is highly reactive with water — potassium is even worse!', ar: 'الصوديوم متفاعل جدًا مع الماء — البوتاسيوم أسوأ بكثير!' },
      wrongMsg: { en: 'Potassium reacts violently with water — too dangerous for this experiment.', ar: 'البوتاسيوم يتفاعل بشدة مع الماء — خطير جدًا لهذه التجربة.' },
    },

    'calcium-water': {
      id: 'calcium-water', difficulty: 'medium',
      name: { en: 'Calcium + Water', ar: 'الكالسيوم والماء' },
      chemicals: ['calcium', 'water'],
      distractor: 'naoh',
      apparatusNeeded: ['beaker'],
      effects: { color: 'color-clear', heat: false, bubbles: true, foam: true },
      successMsg: { en: 'Calcium reacts with water, producing hydrogen gas bubbles!', ar: 'يتفاعل الكالسيوم مع الماء، منتجًا فقاعات غاز الهيدروجين!' },
      explanation: {
        en: 'Calcium is less reactive than sodium. It slowly reacts with water: Ca + 2H₂O → Ca(OH)₂ + H₂↑. The reaction is much calmer and less exothermic.',
        ar: 'الكالسيوم أقل تفاعلاً من الصوديوم. يتفاعل ببطء مع الماء: Ca + 2H₂O → Ca(OH)₂ + H₂↑. التفاعل أهدأ وأقل طرداً للحرارة.',
      },
      hint: { en: 'Calcium reacts with water — sodium hydroxide won\'t show the same effect.', ar: 'الكالسيوم يتفاعل مع الماء — هيدروكسيد الصوديوم لن يُظهر نفس التأثير.' },
      wrongMsg: { en: 'Sodium hydroxide dissolves but doesn\'t react the same way.', ar: 'هيدروكسيد الصوديوم ينحل لكن لا يتفاعل بنفس الطريقة.' },
    },

    'copper-nitric-acid': {
      id: 'copper-nitric-acid', difficulty: 'hard',
      name: { en: 'Copper + Nitric Acid', ar: 'النحاس وحمض النيتريك' },
      chemicals: ['copper', 'nitric_acid'],
      distractor: 'sulfuric_acid',
      apparatusNeeded: ['testTube'],
      effects: { color: 'color-copper', heat: true, bubbles: true, vapor: true },
      successMsg: { en: 'Copper dissolves, releasing brown nitrogen dioxide gas!', ar: 'ينحل النحاس، مطلقًا غاز ثاني أكسيد النيتروجين البني!' },
      explanation: {
        en: '3Cu + 8HNO₃(dilute) → 3Cu(NO₃)₂ + 2NO↑ + 4H₂O. The brown NO₂ gas is toxic. Concentrated nitric acid is even more aggressive.',
        ar: '3Cu + 8HNO₃(مخفّف) → 3Cu(NO₃)₂ + 2NO↑ + 4H₂O. غاز NO₂ البني سام. حمض النيتريك المركز أكثر عدوانية.',
      },
      hint: { en: "Copper reacts with nitric acid to release brown fumes — sulfuric acid won't do this.", ar: 'يتفاعل النحاس مع حمض النيتريك لإطلاق دخان بني — حمض الكبريتيك لن يفعل هذا.' },
      wrongMsg: { en: 'Sulfuric acid reacts with copper differently — no brown gas here.', ar: 'يتفاعل حمض الكبريتيك مع النحاس بشكل مختلف — لا يوجد غاز بني هنا.' },
    },

    'zinc-copper-displacement': {
      id: 'zinc-copper-displacement', difficulty: 'easy',
      name: { en: 'Zinc + Copper Sulfate', ar: 'الزنك وكبريتات النحاس' },
      chemicals: ['zinc', 'copper_sulfate'],
      distractor: 'iron',
      apparatusNeeded: ['testTube'],
      effects: { color: 'color-red', heat: false, bubbles: false, precipitate: true },
      successMsg: { en: 'Copper deposits on the zinc as the blue solution fades to colorless!', ar: 'يترسب النحاس على الزنك بينما يتلاشى المحلول الأزرق!' },
      explanation: {
        en: 'Zinc is more reactive than copper. Zn + CuSO₄ → ZnSO₄ + Cu↓. A displacement reaction where zinc "steals" the sulfate from copper.',
        ar: 'الزنك أكثر تفاعلاً من النحاس. Zn + CuSO₄ → ZnSO₄ + Cu↓. تفاعل إحلال حيث يزيح الزنك كبريتات من النحاس.',
      },
      hint: { en: "Zinc is more reactive than copper — iron won't displace copper this way.", ar: 'الزنك أكثر تفاعلاً من النحاس — الحديد لن يزيح النحاس بهذه الطريقة.' },
      wrongMsg: { en: 'Iron is less reactive than copper — no displacement occurs.', ar: 'الحديد أقل تفاعلاً من النحاس — لا يحدث إزاحة.' },
    },

    'lead-iodide': {
      id: 'lead-iodide', difficulty: 'medium',
      name: { en: 'Lead Nitrate + Potassium Iodide', ar: 'نترات الرصاص + يوديد البوتاسيوم' },
      chemicals: ['lead_nitrate', 'potassium_iodide'],
      distractor: 'sodium_chloride',
      apparatusNeeded: ['beaker'],
      effects: { color: 'color-yellow', heat: false, bubbles: false, precipitate: true },
      successMsg: { en: 'A bright yellow precipitate of lead iodide forms!', ar: 'يتكوّن راسب أصفر ساطع من يوديد الرصاص!' },
      explanation: {
        en: 'Pb(NO₃)₂ + 2KI → PbI₂↓ + 2KNO₃. Lead iodide is a striking yellow solid that forms instantly when the two solutions mix.',
        ar: 'Pb(NO₃)₂ + 2KI → PbI₂↓ + 2KNO₃. يوديد الرصاص صلب أصفر ساطع يتكون فوراً عند خلط المحلولين.',
      },
      hint: { en: "Lead nitrate reacts with iodide — sodium chloride won't give a yellow precipitate.", ar: 'نترات الرصاص تتفاعل مع اليوديد — كلوريد الصوديوم لن ينتج راسب أصفر.' },
      wrongMsg: { en: "Sodium chloride with lead nitrate doesn't produce a yellow precipitate.", ar: 'كلوريد الصوديوم مع نترات الرصاص لا ينتج راسب أصفر.' },
    },

    'starch-iodine': {
      id: 'starch-iodine', difficulty: 'easy',
      name: { en: 'Starch + Iodine (Color)', ar: 'النشا واليود (اللون)' },
      chemicals: ['starch', 'iodine'],
      distractor: 'glucose',
      apparatusNeeded: ['beaker'],
      effects: { color: 'color-blue', heat: false, bubbles: false, precipitate: false },
      successMsg: { en: 'The mixture turns deep blue-black — the classic starch-iodine test!', ar: 'يتحول الخليط إلى أزرق-أسود عميق — اختبار النشا-اليود الكلاسيكي!' },
      explanation: {
        en: 'Iodine molecules fit inside the helical structure of starch, creating a blue-black complex. This is a famous test to detect starch in food.',
        ar: 'تتناسب جزيئات اليود داخل البنية الحلزونية للنشا، مما ينشئ معقد أزرق-أسود. هذا اختبار مشهور للكشف عن النشا في الغذاء.',
      },
      hint: { en: "Iodine forms a dark complex with starch — glucose won't give the same color.", ar: 'يكون اليود معقد داكن مع النشا — الجلوكوز لن يعطي نفس اللون.' },
      wrongMsg: { en: "Glucose doesn't turn blue-black with iodine — no color change.", ar: 'الجلوكوز لا يتحول إلى أزرق-أسود مع اليود — لا تغيير في اللون.' },
    },

    'manganese-hydrogen-peroxide': {
      id: 'manganese-h2o2', difficulty: 'medium',
      name: { en: 'Manganese Dioxide Catalyst', ar: 'عامل MnO₂ الحفّاز' },
      chemicals: ['manganese_dioxide', 'hydrogen_peroxide'],
      distractor: 'iron_oxide',
      apparatusNeeded: ['flask'],
      effects: { color: 'color-clear', heat: false, bubbles: true, foam: false },
      successMsg: { en: 'Vigorous bubbling! Oxygen gas is released rapidly.', ar: 'فوران عنيف! يتم إطلاق غاز الأكسجين بسرعة.' },
      explanation: {
        en: "2H₂O₂ → 2H₂O + O₂↑. MnO₂ acts as a catalyst, speeding up decomposition without being consumed. Iron oxide doesn't catalyze this reaction.",
        ar: '2H₂O₂ → 2H₂O + O₂↑. يعمل MnO₂ كعامل حفّاز، يسرع التحلل دون أن يُستهلك. أكسيد الحديد لا يحفز هذا التفاعل.',
      },
      hint: { en: "Manganese dioxide is a catalyst for H₂O₂ decomposition — iron oxide won't work.", ar: 'ثاني أكسيد المنجنيز عامل حفّاز لتحلل بيروكسيد الهيدروجين — أكسيد الحديد لن ينجح.' },
      wrongMsg: { en: "Iron oxide doesn't effectively catalyze hydrogen peroxide decomposition.", ar: 'أكسيد الحديد لا يحفز بفعالية تحلل بيروكسيد الهيدروجين.' },
    },

    'sugar-sulfuric-acid': {
      id: 'sugar-h2so4', difficulty: 'hard',
      name: { en: 'Sugar + Sulfuric Acid (Dehydration)', ar: 'السكر وحمض الكبريتيك (الجفاف)' },
      chemicals: ['sugar', 'sulfuric_acid'],
      distractor: 'hydrochloric_acid',
      apparatusNeeded: ['beaker', 'burner'],
      effects: { color: 'color-black', heat: true, bubbles: true, foam: true },
      successMsg: { en: 'The sugar blackens into charcoal as water boils off!', ar: 'يتحول السكر إلى فحم أسود بينما يتبخر الماء!' },
      explanation: {
        en: 'C₁₂H₂₂O₁₁ -H₂SO₄→ 12C + H₂O (steam). Sulfuric acid dehydrates the sugar, removing all water and leaving pure carbon. This is a dramatic exothermic reaction!',
        ar: 'C₁₂H₂₂O₁₁ -H₂SO₄→ 12C + H₂O (بخار). يجفف حمض الكبريتيك السكر، مزيلاً كل الماء تاركاً كربون نقي. هذا تفاعل طارد للحرارة درامي!' },
      hint: { en: "Concentrated sulfuric acid dehydrates sugar — hydrochloric acid won't have the same effect.", ar: 'حمض الكبريتيك المركز يجفف السكر — حمض الهيدروكلوريك لن يكون له نفس التأثير.' },
      wrongMsg: { en: "Hydrochloric acid doesn't dehydrate sugar effectively — the dramatic blackening won't occur.", ar: 'حمض الهيدروكلوريك لا يجفف السكر بفعالية — الاسوداد الدرامي لن يحدث.' },
    },

    'aluminum-naoh': {
      id: 'aluminum-naoh', difficulty: 'hard',
      name: { en: 'Aluminum + Sodium Hydroxide', ar: 'الألومنيوم وهيدروكسيد الصوديوم' },
      chemicals: ['aluminum', 'naoh'],
      distractor: 'vinegar',
      apparatusNeeded: ['flask'],
      effects: { color: 'color-clear', heat: true, bubbles: true, foam: true },
      successMsg: { en: 'Rapid bubbling of hydrogen gas — the flask gets hot!', ar: 'فوران سريع لغاز الهيدروجين — يسخن الدورق!' },
      explanation: {
        en: '2Al + 2NaOH + 2H₂O → 2NaAlO₂ + 3H₂↑. Aluminum is amphoteric—it reacts with both acids AND bases. The reaction is exothermic.',
        ar: '2Al + 2NaOH + 2H₂O → 2NaAlO₂ + 3H₂↑. الألومنيوم مادة برمائية—تتفاعل مع الحمضيات والقواعد. التفاعل طارد للحرارة.',
      },
      hint: { en: "Aluminum reacts with bases, not acids — vinegar won't work the same way.", ar: 'يتفاعل الألومنيوم مع القواعد وليس الحمضيات — الخل لن ينجح بنفس الطريقة.' },
      wrongMsg: { en: 'Vinegar is too weak — aluminum needs a strong base like sodium hydroxide.', ar: 'الخل ضعيف جداً — يحتاج الألومنيوم إلى قاعدة قوية مثل هيدروكسيد الصوديوم.' },
    },
  };


  const SCORE_BY_DIFFICULTY = { easy: 10, medium: 20, hard: 30 };
  const TOTAL_EXPERIMENTS = Object.keys(EXPERIMENTS).length;


  /* ----------------------------------------------------------------
     4. DOM SHORTCUTS
  ---------------------------------------------------------------- */
  const $ = (sel, scope) => (scope || document).querySelector(sel);
  const $$ = (sel, scope) => Array.from((scope || document).querySelectorAll(sel));

  // ⚠️ DO NOT INITIALIZE el HERE — moved to init() to ensure DOM is ready
  let el = null;


  /* ----------------------------------------------------------------
     5. NAVIGATION BETWEEN PAGES
  ---------------------------------------------------------------- */
  let leaderboardInterval = null;

  function showPage(pageId) {
    try {
      console.log(`📄 Showing page: ${pageId}`);
      
      $$('.page').forEach((p) => p.classList.toggle('is-active', p.id === `page-${pageId}`));
      $$('.nav-link').forEach((btn) => btn.classList.toggle('is-active', btn.dataset.nav === pageId));
      
      if (!el.header) {
        console.error('❌ el.header is null');
        return;
      }
      if (!el.menuToggle) {
        console.error('❌ el.menuToggle is null');
        return;
      }
      
      el.header.classList.remove('menu-open');
      el.menuToggle.setAttribute('aria-expanded', 'false');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
      // Clear polling only if leaving teacher-setup
      if (pageId !== 'teacher-setup' && leaderboardInterval) {
        console.log('🛑 Stopping leaderboard polling');
        clearInterval(leaderboardInterval);
        leaderboardInterval = null;
      }
      
      // Add polling for teacher-setup page (real-time leaderboard updates)
      if (pageId === 'teacher-setup' && competition.mode === 'class' && !leaderboardInterval) {
        console.log('▶️  Starting leaderboard polling');
        leaderboardInterval = setInterval(() => {
          console.log('🔄 Leaderboard poll tick');
          loadCompetitionData();
          updateTeacherLeaderboard();
        }, 1000); // Update every 1 second
      }
      
      // Show all experiments in Solo mode
      if (pageId === 'experiments' && competition.mode === 'solo') {
        const cards = document.querySelectorAll('[data-experiment]');
        cards.forEach((card) => {
          card.style.display = 'block';
        });
      }
      
      console.log(`✅ Page ${pageId} shown successfully`);
    } catch (e) {
      console.error(`❌ Error showing page ${pageId}:`, e);
    }
  }

  // ⚠️ MOVED TO init() — el must be defined first!


  /* ----------------------------------------------------------------
     6. LOADING SCREEN
  ---------------------------------------------------------------- */
  function showLoading(durationMs, onDone) {
    try {
      console.log('🔄 Loading screen starting...');
      
      if (!el.loadingScreen) {
        console.error('❌ el.loadingScreen is null');
        return;
      }
      
      el.loadingScreen.classList.remove('is-hidden');
      el.loadingScreen.removeAttribute('aria-hidden');
      el.loadingScreen.style.display = 'flex';
      console.log('🔄 Loading screen display: flex');
      
      setTimeout(() => {
        try {
          console.log('🔄 Loading screen timer finished (1100ms), adding is-hidden class...');
          el.loadingScreen.classList.add('is-hidden');
          el.loadingScreen.setAttribute('aria-hidden', 'true');
          console.log('✅ is-hidden class added (500ms CSS animation started)');
          
          // Wait for CSS animation to complete (500ms) before calling callback
          // This allows the opacity/visibility animation to finish before showing the page
          setTimeout(() => {
            console.log('✅ CSS animation complete (500ms finished)!');
            el.loadingScreen.style.display = 'none';
            console.log('✅ Loading screen display set to none');
            
            if (typeof onDone === 'function') {
              console.log('▶️  Calling onDone callback NOW');
              onDone();
            }
          }, 550); // 500ms animation + 50ms buffer
          
        } catch (e) {
          console.error('❌ Error in showLoading timeout:', e);
        }
      }, durationMs);
    } catch (e) {
      console.error('❌ Error in showLoading:', e);
    }
  }


  /* ----------------------------------------------------------------
     7. MODAL HELPERS
  ---------------------------------------------------------------- */
  function openModal(id) {
    console.log(`🔓 Opening modal: ${id}`);
    const modal = document.getElementById(id);
    if (!modal) {
      console.error(`❌ Modal not found: ${id}`);
      return;
    }
    modal.hidden = false;
    console.log(`✅ Modal opened: ${id}`);
  }
  
  function closeModal(id) {
    console.log(`🔒 Closing modal: ${id}`);
    const modal = document.getElementById(id);
    if (!modal) {
      console.error(`❌ Modal not found: ${id}`);
      return;
    }
    modal.hidden = true;
    console.log(`✅ Modal closed: ${id}`);
  }
  // Close via any [data-close-modal], clicking the overlay backdrop, or Escape.
  try {
    document.addEventListener('click', (e) => {
      const closer = e.target.closest('[data-close-modal]');
      if (closer) closeModal(closer.dataset.closeModal);
      if (e.target.classList.contains('modal-overlay')) e.target.hidden = true;
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') $$('.modal-overlay').forEach((m) => { m.hidden = true; });
    });
    console.log('✅ Modal listeners attached');
  } catch (e) {
    console.error('❌ Error attaching modal listeners:', e);
  }

  // ⚠️ MOVED TO init()


  /* ----------------------------------------------------------------
     8. SOUND ENGINE
     Tiny synthesized beeps via the Web Audio API — no audio files
     needed, keeping the project self-contained.
  ---------------------------------------------------------------- */
  let audioCtx = null;
  function getAudioCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
  }
  function playTone(freq, duration, type) {
    if (!state.soundOn) return;
    try {
      const ctx = getAudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (err) { /* audio not available — fail silently */ }
  }
  
  /** Vibrate the device if available (haptic feedback) */
  function vibrate(pattern) {
    if (navigator.vibrate && state.soundOn) {
      navigator.vibrate(pattern);
    }
  }
  const sound = {
    drop: () => playTone(520, 0.12, 'triangle'),
    select: () => playTone(660, 0.08, 'sine'),
    success: () => { playTone(523, 0.12); setTimeout(() => playTone(784, 0.18), 120); },
    error: () => { playTone(220, 0.18, 'sawtooth'); },
    fizz: () => playTone(300, 0.05, 'square'),
    // New reaction sounds
    foam: () => { 
      playTone(400, 0.08, 'square');
      setTimeout(() => playTone(500, 0.1, 'square'), 80);
      setTimeout(() => playTone(600, 0.08, 'sine'), 180);
    },
    vapor: () => {
      playTone(350, 0.15, 'sine');
      setTimeout(() => playTone(420, 0.12, 'sine'), 100);
    },
    precipitate: () => {
      playTone(600, 0.06, 'square');
      setTimeout(() => playTone(500, 0.06, 'square'), 60);
    },
    glow: () => {
      playTone(800, 0.1, 'sine');
      setTimeout(() => playTone(950, 0.12, 'sine'), 80);
      setTimeout(() => playTone(1100, 0.15, 'sine'), 160);
    },
    click: () => playTone(750, 0.04, 'square'),
  };

  // ⚠️ MOVED TO init() — el must be defined first


  /* ----------------------------------------------------------------
     9. SCORE / PROGRESS PERSISTENCE
  ---------------------------------------------------------------- */
  function updateScoreUI() {
    try {
      if (!el.scoreValue) {
        console.warn('⚠️ el.scoreValue is null, skipping update');
        return;
      }
      if (!el.scorePanelValue) {
        console.warn('⚠️ el.scorePanelValue is null, skipping update');
        return;
      }
      if (!el.completedValue) {
        console.warn('⚠️ el.completedValue is null, skipping update');
        return;
      }
      
      el.scoreValue.textContent = state.score;
      el.scorePanelValue.textContent = state.score;
      el.completedValue.textContent = `${state.completed.length} / ${TOTAL_EXPERIMENTS}`;
      // ⚠️ progressBar not in HTML
      updateCompletedBadges();
    } catch (e) {
      console.error('❌ Error in updateScoreUI:', e);
    }
  }
  function awardScore(experiment) {
    if (state.completed.includes(experiment.id)) return; // already scored once
    state.score += SCORE_BY_DIFFICULTY[experiment.difficulty] || 10;
    state.completed.push(experiment.id);
    localStorage.setItem('chemlab_score', String(state.score));
    localStorage.setItem('chemlab_completed', JSON.stringify(state.completed));
    updateScoreUI();
  }

  /** Marks each experiment card as "completed" (small badge, replay still
   *  allowed) based on state.completed — called on init, after finishing
   *  an experiment, and whenever the experiment-selection page is shown. */
  function updateCompletedBadges() {
    $$('.experiment-card').forEach((card) => {
      card.classList.toggle('is-completed', state.completed.includes(card.dataset.experiment));
    });
  }


  /* ----------------------------------------------------------------
     10. LAB RENDERING — build the chemical shelf + show only the
     apparatus a given experiment actually needs (declutters the bench).
  ---------------------------------------------------------------- */
  function renderExperimentInLab(experimentId, opts) {
    opts = opts || {};
    const exp = EXPERIMENTS[experimentId];
    state.currentExperimentId = experimentId;
    el.labExperimentTitle.textContent = exp.name[state.lang];

    // Update the chalkboard with experiment name and formula
    updateBoard(exp.name[state.lang], exp.chemicals.map(chemId => CHEMICALS[chemId].formula).join(' + '));

    updateApparatusVisibility(exp.apparatusNeeded);

    // Build the shelf: the two correct chemicals + one distractor, shuffled.
    const bottleIds = [...exp.chemicals, exp.distractor].sort(() => Math.random() - 0.5);
    el.bottleRow.innerHTML = '';
    bottleIds.forEach((chemId) => el.bottleRow.appendChild(buildBottleEl(chemId)));

    if (!opts.keepState) resetApparatusVisuals(); // fresh attempt for a newly chosen experiment
  }

  /** "Free mix" mode: reached via the header's Virtual Lab link (not an
   *  experiment card) — shows every tool and every chemical to explore. */
  function showFreeMode() {
    state.currentExperimentId = null;
    el.labExperimentTitle.textContent = I18N[state.lang].lab_default_title;
    updateBoard(I18N[state.lang].lab_default_title, 'Mix freely');
    updateApparatusVisibility(null); // null = show all apparatus
    
    // === Show ONLY 6 primary elements in Free Mode ===
    const PRIMARY_ELEMENTS = ['hydrogen', 'oxygen', 'carbon', 'nitrogen', 'sodium', 'chlorine'];
    
    el.bottleRow.innerHTML = '';
    PRIMARY_ELEMENTS.forEach((elementId) => {
      if (CHEMICALS[elementId]) {
        el.bottleRow.appendChild(buildBottleEl(elementId));
      }
    });
    
    // === Initialize apparatus selector with Beaker selected by default ===
    initApparatusSelector();
    
    resetApparatusVisuals();
    
    // Update message
    logMessage(I18N[state.lang].msg_welcome_free, 'info');
  }

  /** Initialize the apparatus selector buttons (Beaker, Test Tube, Flask) */
  function initApparatusSelector() {
    const buttons = document.querySelectorAll('.apparatus-icon');
    buttons.forEach((btn) => {
      btn.classList.remove('active');
      btn.addEventListener('click', () => handleApparatusSelect(btn.dataset.container));
    });
    
    // Set Beaker as default
    document.querySelector('[data-container="beaker"]').classList.add('active');
    setSelectedApparatus('beaker');
  }

  /** Handle apparatus selection from selector icons */
  function handleApparatusSelect(containerId) {
    const buttons = document.querySelectorAll('.apparatus-icon');
    buttons.forEach((btn) => btn.classList.remove('active'));
    document.querySelector(`[data-container="${containerId}"]`).classList.add('active');
    
    setSelectedApparatus(containerId);
    const containerNames = { beaker: 'Beaker', testTube: 'Test Tube', flask: 'Flask' };
    logMessage(`Selected: ${containerNames[containerId] || containerId}`, 'info');
  }

  /** Set which apparatus is selected for chemical drops */
  function setSelectedApparatus(containerId) {
    Object.keys(APPARATUS_IDS).forEach((id) => {
      APPARATUS_IDS[id].el.dataset.selected = (id === containerId ? 'true' : 'false');
    });
  }

  /** Shows only the apparatus listed in neededList (e.g. ['beaker','burner']).
   *  Pass null/undefined to show all of them (free mix mode). */
  function updateApparatusVisibility(neededList) {
    Object.entries(APPARATUS_IDS).forEach(([id, refs]) => {
      const show = !neededList || neededList.includes(id);
      refs.el.classList.toggle('is-hidden-tool', !show);
    });
    const showBurner = !neededList || neededList.includes('burner');
    el.burner.classList.toggle('is-hidden-tool', !showBurner);
  }

  function buildBottleEl(chemId) {
    const chem = CHEMICALS[chemId];
    const bottle = document.createElement('div');
    bottle.className = 'chem-bottle';
    bottle.dataset.chemicalId = chemId;
    bottle.style.setProperty('--bottle-color', chem.bottleColor);
    bottle.innerHTML = `
      <button class="bottle-info-btn" type="button" aria-label="Chemical info">ⓘ</button>
      <div class="bottle-shape">
        <div class="bottle-cap"></div>
        <div class="bottle-fill"></div>
        <div class="bottle-shine"></div>
        <div class="bottle-label"></div>
      </div>
      <span class="bottle-name">${chem.formula}</span>
    `;

    // --- Real pointer-based drag: the bottle follows the cursor/finger ---
    bottle.addEventListener('pointerdown', (e) => onBottlePointerDown(e, chemId, bottle));

    // --- Info button: shows full chemical details, independent of dragging ---
    const infoBtn = bottle.querySelector('.bottle-info-btn');
    infoBtn.addEventListener('pointerdown', (e) => e.stopPropagation()); // don't start a drag
    infoBtn.addEventListener('click', (e) => { e.stopPropagation(); openChemInfo(chemId); });

    return bottle;
  }

  function openChemInfo(chemId) {
    const chem = CHEMICALS[chemId];
    document.getElementById('chemInfoTitle').textContent = chem.name[state.lang];
    document.getElementById('chemInfoFormula').textContent = `${chem.formula} — ${chem.short[state.lang]}`;
    document.getElementById('chemInfoText').textContent = chem.info[state.lang];
    openModal('chemInfoModal');
  }


  /* ----------------------------------------------------------------
     11. REAL DRAG & DROP (Pointer Events)
     The bottle itself (a floating clone) follows the pointer/finger.
     Releasing it over a piece of glassware adds that chemical.
     A plain tap (no movement) falls back to select-then-tap-to-apply,
     which keeps things usable for keyboard/switch-access users too.
  ---------------------------------------------------------------- */
  // ⚠️ MOVED TO init() — requires DOM to be ready

  let dragCtx = null;              // active drag state, or null
  let suppressNextZoneClick = false; // guards against a stray click right after a drop
  
  // ✅ Will be initialized in init()
  let APPARATUS_IDS = {
    beaker: null,
    testTube: null,
    flask: null,
  };

  function onBottlePointerDown(e, chemId, bottleEl) {
    if (e.button !== undefined && e.button !== 0) return; // left click / primary touch only
    e.preventDefault();
    
    sound.select();
    vibrate(20);

    const clone = bottleEl.cloneNode(true);
    clone.classList.add('bottle-drag-clone');
    clone.querySelectorAll('.bottle-info-btn').forEach((b) => b.remove());
    clone.style.width = `${bottleEl.offsetWidth}px`;
    clone.hidden = true;
    document.body.appendChild(clone);

    dragCtx = { chemId, bottleEl, clone, startX: e.clientX, startY: e.clientY, moved: false, pointerId: e.pointerId };
    bottleEl.classList.add('is-dragging');
    try { bottleEl.setPointerCapture(e.pointerId); } catch (err) { /* not critical */ }
    bottleEl.addEventListener('pointermove', onBottlePointerMove);
    bottleEl.addEventListener('pointerup', onBottlePointerUp);
    bottleEl.addEventListener('pointercancel', onBottlePointerUp);
  }

  function onBottlePointerMove(e) {
    if (!dragCtx) return;
    const dx = e.clientX - dragCtx.startX;
    const dy = e.clientY - dragCtx.startY;
    if (!dragCtx.moved && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
      dragCtx.moved = true;
      dragCtx.clone.hidden = false;
    }
    if (!dragCtx.moved) return;

    dragCtx.clone.style.left = `${e.clientX}px`;
    dragCtx.clone.style.top = `${e.clientY}px`;

    const hovered = document.elementFromPoint(e.clientX, e.clientY);
    const zone = hovered && hovered.closest('.apparatus[data-role="dropzone"]:not(.is-hidden-tool)');
    $$('.apparatus.is-drag-over').forEach((z) => z.classList.remove('is-drag-over'));
    if (zone) zone.classList.add('is-drag-over');
  }

  function onBottlePointerUp(e) {
    if (!dragCtx) return;
    const { chemId, bottleEl, clone, moved, pointerId } = dragCtx;
    bottleEl.removeEventListener('pointermove', onBottlePointerMove);
    bottleEl.removeEventListener('pointerup', onBottlePointerUp);
    bottleEl.removeEventListener('pointercancel', onBottlePointerUp);
    try { bottleEl.releasePointerCapture(pointerId); } catch (err) { /* not critical */ }
    bottleEl.classList.remove('is-dragging');
    clone.remove();
    $$('.apparatus.is-drag-over').forEach((z) => z.classList.remove('is-drag-over'));

    if (moved) {
      const target = document.elementFromPoint(e.clientX, e.clientY);
      const zone = target && target.closest('.apparatus[data-role="dropzone"]');
      if (zone && !zone.classList.contains('is-hidden-tool')) {
        sound.drop();
        vibrate([30, 20]);
        state.selectedChemical = null;
        $$('.chem-bottle.is-selected').forEach((b) => b.classList.remove('is-selected'));
        suppressNextZoneClick = true;
        setTimeout(() => { suppressNextZoneClick = false; }, 60);
        handleAddChemical(zone.id, chemId);
      }
    } else {
      // No movement — treat it as a tap: select this chemical for tap-to-apply.
      $$('.chem-bottle', el.bottleRow).forEach((b) => b.classList.remove('is-selected'));
      if (state.selectedChemical === chemId) {
        state.selectedChemical = null;
      } else {
        state.selectedChemical = chemId;
        bottleEl.classList.add('is-selected');
        sound.select();
      }
    }
    dragCtx = null;
  }

  // Tap-to-apply fallback: tap a zone after selecting a bottle without dragging.
  // ⚠️ MOVED TO init() — APPARATUS_IDS required

  /** Plays a short "pour" animation (tilting bottle + curved stream) above
   *  the given apparatus, then calls onDone() once it finishes. Appended to
   *  #benchSurface (not the apparatus itself) so it's never clipped by the
   *  apparatus's own overflow:hidden / clip-path glass shape. */
  function playPour(apparatusEl, colorHex, onDone) {
    const bench = document.getElementById('benchSurface');
    const benchRect = bench.getBoundingClientRect();
    const apRect = apparatusEl.getBoundingClientRect();
    const centerX = apRect.left + apRect.width / 2 - benchRect.left;
    const topY = apRect.top - benchRect.top - 50; // 50px above the apparatus's top edge

    const fx = document.createElement('div');
    fx.className = 'pour-fx';
    fx.style.setProperty('--pour-color', colorHex);
    fx.style.left = `${centerX}px`;
    fx.style.top = `${topY}px`;
    fx.innerHTML = `<div class="pour-bottle"><div class="pour-fill"></div></div><div class="pour-stream"></div>`;
    bench.appendChild(fx);
    sound.drop();
    setTimeout(() => {
      fx.remove();
      if (typeof onDone === 'function') onDone();
    }, 700);
  }

  function handleAddChemical(apparatusId, chemId) {
    const apRefs = APPARATUS_IDS[apparatusId];
    const apState = state.apparatus[apparatusId];

    // === In Free Mode: only allow drops on the SELECTED apparatus ===
    if (!state.currentExperimentId) {
      const isSelected = apRefs.el.dataset.selected === 'true';
      if (!isSelected) {
        logMessage('Please select a container first', 'warning');
        return;
      }
    }

    if (apState.resolved) {
      logMessage(I18N[state.lang].full_note, 'warning');
      return;
    }
    if (apState.added.includes(chemId)) {
      logMessage(I18N[state.lang].msg_already, 'warning');
      return;
    }

    // Play the pour animation first, then apply the actual chemistry once it finishes.
    playPour(apRefs.el, CHEMICALS[chemId].bottleColor, () => {
      apState.added.push(chemId);

      if (apState.added.length === 1) {
        // First chemical: just show a partial fill in its own natural color.
        apRefs.liquid.className = 'liquid color-clear';
        apRefs.liquid.style.height = '35%';
        logMessage(I18N[state.lang].msg_added(CHEMICALS[chemId].name[state.lang]), 'info');
        return;
      }

      // Second chemical → evaluate the reaction.
      evaluateReaction(apparatusId, apRefs, apState);
    });
  }


  /* ----------------------------------------------------------------
     12. REACTION ENGINE
  ---------------------------------------------------------------- */
  function evaluateReaction(apparatusId, apRefs, apState) {
    const exp = state.currentExperimentId ? EXPERIMENTS[state.currentExperimentId] : null;
    const isFreeMode = !state.currentExperimentId;
    
    // === For guided experiments: check exact match ===
    const isMatch = exp && sameSet(exp.chemicals, apState.added);
    
    // === For Free Mode: check against FREE_REACTIONS ===
    let freeReaction = null;
    if (isFreeMode) {
      freeReaction = FREE_REACTIONS.find(r => sameSet(r.needed, apState.added));
    }

    apState.resolved = true;
    apRefs.liquid.style.height = '70%';

    if (isMatch || freeReaction) {
      // ---- SUCCESS: Apply reaction effects ----
      const reaction = isMatch ? exp.effects : freeReaction;
      const message = isMatch ? exp.successMsg[state.lang] : freeReaction.result.text[state.lang];
      const color = isMatch ? exp.effects.color : freeReaction.result.color;
      
      apRefs.liquid.classList.add(color, 'is-reacting');
      apRefs.el.classList.add('is-reacting', 'reaction-pulse');
      vibrate([30, 50, 30]);

      if ((isMatch && exp.effects.bubbles) || (!isMatch && freeReaction.bubbles)) {
        apRefs.el.classList.add('is-fizzing');
        spawnBubbles(apRefs.bubbles, 16);
        sound.fizz();
      }
      if ((isMatch && exp.effects.precipitate) || (!isMatch && freeReaction.precipitate)) {
        apRefs.el.classList.add('has-precipitate');
        spawnPrecipitate(apRefs.precipitate, 8);
        sound.precipitate();
      }
      if ((isMatch && exp.effects.heat) || (!isMatch && freeReaction.heat)) {
        apRefs.el.classList.add('is-hot');
        setTimeout(() => apRefs.el.classList.remove('is-hot'), 3200);
      }

      logMessage(message, 'success');
      if (!isFreeMode) awardScore(exp);
      sound.success();
      vibrate([30, 50, 30]);

      console.log('✅ REACTION SUCCESSFUL:', message);

      if (isMatch && competition.mode === 'class' && competition.studentName) {
        handleStudentExperimentComplete(state.currentExperimentId);
      }

      setTimeout(() => {
        openResultModal({
          success: true,
          title: isMatch ? exp.name[state.lang] : freeReaction.name[state.lang],
          text: message
        });
      }, 1400);

    } else {
      // ---- NO REACTION / INVALID COMBINATION ----
      apRefs.liquid.classList.add('color-colorless');
      apRefs.el.classList.add('is-blocked');
      vibrate([100, 50, 100, 50]);
      setTimeout(() => apRefs.el.classList.remove('is-blocked'), 450);

      let msg;
      if (isFreeMode) {
        msg = I18N[state.lang].msg_free_no_reaction || 'No reaction — try different elements!';
      } else {
        msg = exp ? exp.wrongMsg[state.lang] : I18N[state.lang].msg_wrong_start;
      }
      
      logMessage(msg, 'error');
      sound.error();
      
      setTimeout(() => {
        openResultModal({
          success: false,
          title: state.lang === 'ar' ? 'لا يوجد تفاعل' : 'No Reaction',
          text: msg,
        });
      }, 650);
    }
  }

  function sameSet(a, b) {
    if (a.length !== b.length) return false;
    return [...a].sort().join(',') === [...b].sort().join(',');
  }

  function spawnBubbles(container, count) {
    for (let i = 0; i < count; i++) {
      const b = document.createElement('span');
      b.className = 'bubble';
      const size = 4 + Math.random() * 6;
      b.style.width = `${size}px`;
      b.style.height = `${size}px`;
      b.style.left = `${10 + Math.random() * 80}%`;
      b.style.animationDelay = `${Math.random() * 1.2}s`;
      container.appendChild(b);
      setTimeout(() => b.remove(), 3000);
    }
  }

  /** Elephant-toothpaste style foam: bigger, cream-colored, denser and
   *  slower than gas bubbles, piling up near the top of the flask. */
  function spawnFoam(container, count) {
    for (let i = 0; i < count; i++) {
      const f = document.createElement('span');
      f.className = 'bubble foam-particle';
      const size = 8 + Math.random() * 11;
      f.style.width = `${size}px`;
      f.style.height = `${size}px`;
      f.style.left = `${4 + Math.random() * 92}%`;
      f.style.animationDelay = `${Math.random() * 1.6}s`;
      f.style.animationDuration = `${1.7 + Math.random()}s`;
      container.appendChild(f);
      setTimeout(() => f.remove(), 4200);
    }
  }

  /** Dry-ice style vapor: soft blurred fog puffs that billow out and sink,
   *  visually distinct from both gas bubbles and foam. */
  function spawnVapor(container, count) {
    for (let i = 0; i < count; i++) {
      const v = document.createElement('span');
      v.className = 'vapor-puff';
      const size = 22 + Math.random() * 22;
      v.style.width = `${size}px`;
      v.style.height = `${size}px`;
      v.style.left = `${Math.random() * 75}%`;
      v.style.setProperty('--drift', `${(Math.random() - 0.5) * 40}px`);
      v.style.animationDelay = `${Math.random() * 1}s`;
      container.appendChild(v);
      setTimeout(() => v.remove(), 3400);
    }
  }

  function spawnPrecipitate(container, count) {
    for (let i = 0; i < count; i++) {
      const g = document.createElement('span');
      g.className = 'grain';
      g.style.left = `${8 + Math.random() * 80}%`;
      g.style.bottom = `${Math.random() * 60}%`;
      g.style.animationDelay = `${Math.random() * 0.5}s`;
      container.appendChild(g);
    }
  }

  function logMessage(text, level) {
    try {
      if (!el.messageLog) {
        console.warn('⚠️ el.messageLog is null, cannot log message:', text);
        return;
      }
      const p = document.createElement('p');
      p.className = `msg msg-${level}`;
      p.textContent = text;
      el.messageLog.appendChild(p);
      el.messageLog.scrollTop = el.messageLog.scrollHeight;
    } catch (e) {
      console.error('❌ Error in logMessage:', e);
    }
  }

  function openResultModal({ success, title, text }) {
    console.log('========== OPENING RESULT MODAL ==========');
    console.log('Success:', success);
    console.log('Title:', title);
    console.log('Text:', text);
    
    const modal = document.getElementById('resultModal');
    const icon = document.getElementById('resultIcon');
    const titleEl = document.getElementById('resultModalTitle');
    const explanationEl = document.getElementById('resultExplanation');
    
    console.log('Elements found:', {
      modal: !!modal,
      icon: !!icon,
      title: !!titleEl,
      explanation: !!explanationEl
    });
    
    if (!modal || !icon || !titleEl || !explanationEl) {
      console.error('❌ MISSING ELEMENTS!');
      alert(`Result: ${title}\n${text}`);
      return;
    }
    
    // Set content
    icon.textContent = success ? '✔' : '✕';
    icon.classList.remove('is-error');
    if (!success) icon.classList.add('is-error');
    
    titleEl.textContent = title || (success ? 'Success!' : 'Try Again');
    explanationEl.textContent = text || (success ? 'Great!' : 'Try again');
    
    explanationEl.classList.remove('success', 'error');
    explanationEl.classList.add(success ? 'success' : 'error');
    
    // Open modal
    modal.hidden = false;
    console.log('✅ RESULT MODAL OPENED');
    console.log('========== END RESULT MODAL ==========');
  }

  // Result modal buttons - handled via event delegation (see Navigation section)
  // This ensures buttons work even if DOM elements load after this code

  /* ----------------------------------------------------------------
     13. BURNER, RESET, HINT, SAFETY
  ---------------------------------------------------------------- */
  // ⚠️ MOVED TO init()

  /** Update the chalkboard with experiment info */
  function updateBoard(expName, formula) {
    const line1 = document.getElementById('boardLine1');
    const line2 = document.getElementById('boardLine2');
    
    if (line1) {
      line1.style.animation = 'none';
      setTimeout(() => {
        line1.textContent = expName || 'Experiment';
        line1.style.animation = 'chalkWrite 0.6s ease-out forwards';
      }, 10);
    }
    
    if (line2) {
      line2.style.animation = 'none';
      setTimeout(() => {
        line2.textContent = formula || 'Formula';
        line2.style.animation = 'chalkWrite 0.5s ease-out forwards';
      }, 100);
    }
  }

  /** Clear the board explanation */
  function clearBoardExplanation() {
    const explanation = document.getElementById('boardExplanation');
    if (explanation) {
      explanation.textContent = '';
      explanation.style.animation = 'none';
    }
  }

  /** Show the explanation on the board after reaction */
  function showBoardExplanation(text) {
    const explanation = document.getElementById('boardExplanation');
    if (explanation) {
      explanation.style.animation = 'none';
      setTimeout(() => {
        explanation.textContent = text;
        explanation.style.animation = 'chalkFade 0.8s ease-out forwards';
      }, 10);
    }
  }

  function resetApparatusVisuals() {
    try {
      if (!APPARATUS_IDS || Object.keys(APPARATUS_IDS).length === 0) {
        console.warn('⚠️ APPARATUS_IDS not initialized, skipping reset');
        return;
      }
      
      Object.entries(APPARATUS_IDS).forEach(([id, refs]) => {
        if (!refs || !refs.el) return;
        state.apparatus[id] = { added: [], resolved: false };
        if (refs.liquid) {
          refs.liquid.className = 'liquid';
          refs.liquid.style.height = '0%';
        }
        refs.el.classList.remove('is-reacting', 'is-fizzing', 'has-precipitate', 'is-hot', 'is-blocked', 'is-foaming', 'is-vapor', 'is-glowing');
        if (refs.bubbles) refs.bubbles.innerHTML = '';
        if (refs.precipitate) refs.precipitate.innerHTML = '';
      });
      
      if (el.messageLog) {
        el.messageLog.innerHTML = '';
      } else {
        console.warn('⚠️ el.messageLog is null, skipping message log clear');
      }
      
      logMessage(I18N[state.lang].msg_welcome, 'info');
      clearBoardExplanation();
    } catch (e) {
      console.error('❌ Error in resetApparatusVisuals:', e);
    }
  }
  function resetLab() {
    resetApparatusVisuals();
  }
  // ⚠️ MOVED TO init()


  /* ----------------------------------------------------------------
     14. WIRE UP EXPERIMENT CARDS + INIT
  ---------------------------------------------------------------- */
  // ⚠️ MOVED TO init()

  function init() {
    console.log('🚀 APP INITIALIZING...');
    
    // ✅ Initialize el FIRST — now DOM is guaranteed to be ready
    if (!el) {
      el = {
        loadingScreen: $('#loadingScreen'),
        header: $('.header-inner'),
        menuToggle: $('#menuToggle'),
        scoreValue: $('#scoreValue'),
        scorePanelValue: $('#scorePanelValue'),
        completedValue: $('#completedValue'),
        soundToggle: $('#soundToggle'),
        langToggle: $('#langToggle'),
        safetyBtn: $('#safetyBtn'),
        startExperimentBtn: $('#startExperimentBtn'),
        experimentGrid: $('#experimentGrid'),
        labExperimentTitle: $('#labExperimentTitle'),
        hintText: $('#hintText'),
        resultModal: $('#resultModal'),
        resultIcon: $('#resultIcon'),
        resultTitle: $('#resultModalTitle'),
        resultExplanation: $('#resultExplanation'),
        resultTryAgainBtn: $('#resultTryAgainBtn'),
        resultNextBtn: $('#resultNextBtn'),
        burner: $('#burner'),
        burnerKnob: $('#burnerKnob'),
        labExperimentDescription: $('#labExperimentDescription'),
        bottleRow: $('#bottleRow'),
        messageLog: $('#messageLog'),
        resetBtn: $('#resetBtn'),
      };
      
      // Verify all elements are found
      const missingElements = [];
      for (const [key, value] of Object.entries(el)) {
        if (!value) {
          missingElements.push(key);
        }
      }
      if (missingElements.length > 0) {
        console.error('❌ Missing DOM elements:', missingElements);
      } else {
        console.log('✅ DOM elements cached successfully');
      }
      
      // ✅ Initialize APPARATUS_IDS AFTER el (make it available to other functions)
      APPARATUS_IDS.beaker = { el: $('#beaker'), liquid: $('#beakerLiquid'), bubbles: $('#beakerBubbles'), precipitate: $('#beakerPrecipitate') };
      APPARATUS_IDS.testTube = { el: $('#testTube'), liquid: $('#testTubeLiquid'), bubbles: null, precipitate: null };
      APPARATUS_IDS.flask = { el: $('#flask'), liquid: $('#flaskLiquid'), bubbles: $('#flaskBubbles'), precipitate: null };
      
      console.log('✅ APPARATUS_IDS initialized');
      
      // ✅ APPARATUS_IDS listeners
      Object.entries(APPARATUS_IDS).forEach(([apparatusId, refs]) => {
        refs.el.addEventListener('click', () => {
          if (suppressNextZoneClick) return;
          if (!state.selectedChemical) return;
          handleAddChemical(apparatusId, state.selectedChemical);
          state.selectedChemical = null;
          $$('.chem-bottle.is-selected').forEach((b) => b.classList.remove('is-selected'));
        });
      });
      
      // ✅ NOW SAFE: Add listeners after APPARATUS_IDS is defined
      el.menuToggle.addEventListener('click', () => {
        const open = el.header.classList.toggle('menu-open');
        el.menuToggle.setAttribute('aria-expanded', String(open));
      });

      el.startExperimentBtn.addEventListener('click', () => showPage('mode-select'));
      
      // ✅ ALL OTHER el LISTENERS NOW SAFE
      el.safetyBtn.addEventListener('click', () => openModal('safetyModal'));
      
      el.soundToggle.addEventListener('click', () => {
        state.soundOn = !state.soundOn;
        el.soundToggle.setAttribute('aria-pressed', String(state.soundOn));
        el.soundToggle.style.opacity = state.soundOn ? '1' : '0.5';
      });

      el.langToggle.addEventListener('click', () => {
        state.lang = state.lang === 'ar' ? 'en' : 'ar';
        localStorage.setItem('chemlab_lang', state.lang);
        applyTranslations();
      });
      
      el.burnerKnob.addEventListener('click', () => {
        const lit = el.burner.classList.toggle('is-lit');
        el.burnerKnob.setAttribute('aria-pressed', String(lit));
        el.burner.dataset.armed = String(lit);
        if (lit) playTone(180, 0.15, 'sawtooth');
      });
      
      el.resetBtn.addEventListener('click', resetLab);

      // ⚠️ hintBtn not in HTML, skipping listener
      
      el.experimentGrid.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-start');
        if (!btn) return;
        const experimentId = btn.dataset.experiment;
        showLoading(900, () => {
          renderExperimentInLab(experimentId);
          showPage('lab');
        });
      });
      
      console.log('✅ All listeners attached');
    }
    
    try {
      console.log('📋 Loading competition data...');
      loadCompetitionData(); // Load saved state first
    } catch (e) {
      console.error('❌ Error loading competition data:', e);
    }
    
    try {
      console.log('🌐 Applying translations...');
      applyTranslations();
    } catch (e) {
      console.error('❌ Error applying translations:', e);
    }
    
    try {
      console.log('📊 Updating score UI...');
      updateScoreUI();
    } catch (e) {
      console.error('❌ Error updating score UI:', e);
    }
    
    try {
      console.log('🔧 Resetting apparatus visuals...');
      resetApparatusVisuals();
    } catch (e) {
      console.error('❌ Error resetting apparatus visuals:', e);
    }
    
    // ===== RESULT MODAL + MODE SELECTION =====
    document.addEventListener('click', (e) => {
      // ===== VIBRATE ON CLICK =====
      const btn = e.target.closest('button');
      if (btn && !e.target.closest('[data-nav]') && !e.target.closest('#resultTryAgainBtn') && !e.target.closest('#resultNextBtn')) {
        vibrate(15); // Short haptic feedback
      }
      
      // ===== RESULT MODAL BUTTONS =====
      const tryAgainBtn = e.target.closest('#resultTryAgainBtn');
      if (tryAgainBtn) {
        console.log('🔄 TRY AGAIN CLICKED');
        closeModal('resultModal');
        resetLab();
        return;
      }
      
      const nextBtn = e.target.closest('#resultNextBtn');
      if (nextBtn) {
        console.log('➡️  NEXT EXPERIMENT CLICKED');
        console.log('Mode:', competition.mode);
        console.log('Student:', competition.studentName);
        console.log('Selected exps:', competition.selectedExperiments);
        console.log('Current exp:', state.currentExperimentId);
        
        closeModal('resultModal');
        
        // Class mode - go to next experiment
        if (competition.mode === 'class' && competition.studentName && competition.selectedExperiments && competition.selectedExperiments.length > 0) {
          const currentIdx = competition.selectedExperiments.indexOf(state.currentExperimentId);
          const nextIdx = currentIdx + 1;
          
          console.log(`Index: ${currentIdx} → ${nextIdx}/${competition.selectedExperiments.length}`);
          
          if (nextIdx < competition.selectedExperiments.length) {
            const nextExpId = competition.selectedExperiments[nextIdx];
            console.log(`📌 LOADING: ${nextExpId}`);
            renderExperimentInLab(nextExpId);
            showPage('lab');
          } else {
            console.log('✅ ALL DONE - Going to experiments');
            showPage('experiments');
          }
        } else {
          console.log('🔄 SOLO/FREE MODE - Going to experiments');
          showPage('experiments');
        }
        return;
      }
      
      // ===== MODE SELECTION =====
      const modeBtn = e.target.closest('[data-mode]');
      if (modeBtn) {
        handleModeSelection(modeBtn.dataset.mode);
        return;
      }
      
      const classMode = e.target.closest('[data-class-mode]');
      if (classMode) {
        const mode = classMode.dataset.classMode;
        if (mode === 'teacher') {
          buildTeacherExperimentsChecklist();
          showPage('teacher-setup');
        } else if (mode === 'student') {
          showPage('student-join');
        }
        return;
      }

      const navBtn = e.target.closest('[data-nav]');
      if (navBtn) {
        const page = navBtn.dataset.nav;
        if (page === 'mode-select') showPage('mode-select');
        else if (page === 'home') showPage('home');
        else if (page === 'experiments') showPage('experiments');
        else if (page === 'lab') showPage('lab');
        return;
      }
      
      const expCard = e.target.closest('[data-experiment]');
      if (expCard) {
        const experimentId = expCard.dataset.experiment;
        renderExperimentInLab(experimentId);
        showPage('lab');
        return;
      }
    });

    // ===== COMPETITION BUTTONS =====
    document.getElementById('createCompetitionBtn')?.addEventListener('click', handleCreateCompetition);
    document.getElementById('joinCompetitionBtn')?.addEventListener('click', handleStudentJoin);
    document.getElementById('endCompetitionBtn')?.addEventListener('click', handleEndCompetition);
    document.getElementById('copyCodeBtn')?.addEventListener('click', () => {
      const code = document.getElementById('competitionCode')?.textContent;
      if (code) {
        navigator.clipboard.writeText(code).then(() => {
          sound.success();
          vibrate(30);
        }).catch(() => {
          // Fallback: show alert if copy fails
          alert('Code: ' + code);
        });
      }
    });
    
    console.log('✅ APP INITIALIZED COMPLETE');
    // Simulated first-load delay so the loading animation is actually seen.
    showLoading(1100, () => {
      console.log('📄 Loading complete — showing home page');
      showPage('home');
    });
  }

  // Optional hand-tracking module (hand-tracking.js) talks to us only
  // through this one event — the core app has zero dependency on it,
  // and works identically whether or not that file is even present.
  let freeMode = {
    init() {
      // Free mode is now just using the regular lab with all chemicals available
      // No need for special initialization
    }
  };

  // Navigation for other buttons
  document.addEventListener('handtrack:drop', (e) => {
    const { apparatusId, chemId } = e.detail || {};
    if (apparatusId && chemId) handleAddChemical(apparatusId, chemId);
  });

  /* ================================================================
     15. CLASS COMPETITION MODE
  ================================================================ */

  // Competition state
  const competition = {
    mode: null,  // 'solo', 'teacher', 'student'
    code: null,
    selectedExperiments: [],
    studentName: null,
    students: {}  // { name: { completed: 0/6, startTime, experiments: [] } }
  };

  function generateRandomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  function saveCompetitionData() {
    localStorage.setItem('chemlab_competition', JSON.stringify(competition));
  }

  function loadCompetitionData() {
    const data = localStorage.getItem('chemlab_competition');
    if (data) Object.assign(competition, JSON.parse(data));
  }

  function buildTeacherExperimentsChecklist() {
    const container = document.getElementById('teacherExperimentsChecklist');
    if (!container) return;
    container.innerHTML = '';
    for (const expId in EXPERIMENTS) {
      const exp = EXPERIMENTS[expId];
      const label = document.createElement('label');
      label.innerHTML = `
        <input type="checkbox" name="exp-${expId}" value="${expId}">
        <span>${exp.name[state.lang]}</span>
      `;
      container.appendChild(label);
    }
  }

  function handleModeSelection(mode) {
    competition.mode = mode;
    if (mode === 'solo') {
      showPage('experiments');
      state.currentExperimentId = null;
      resetApparatusVisuals();
    } else if (mode === 'free') {
      state.currentExperimentId = null;
      el.labExperimentTitle.textContent = 'Free Mix Laboratory';
      updateBoard('Free Mode', 'Mix & Discover');
      updateApparatusVisibility(null); // show all
      el.bottleRow.innerHTML = '';
      Object.keys(CHEMICALS).forEach((chemId) => el.bottleRow.appendChild(buildBottleEl(chemId)));
      resetApparatusVisuals();
      showPage('lab');
      freeMode.init();
    } else if (mode === 'class') {
      showPage('mode-select-class');
    }
  }

  function handleCreateCompetition() {
    console.log('👨‍🏫 Creating competition...');
    
    const checkboxes = document.querySelectorAll('#teacherExperimentsChecklist input:checked');
    if (checkboxes.length === 0) {
      const msg = I18N[state.lang].msg_select_exp || 'Please select at least one experiment';
      alert(msg);
      console.warn('❌ No experiments selected');
      return;
    }
    
    // Validate experiments exist
    const selectedExperiments = Array.from(checkboxes).map(cb => cb.value);
    const invalidExperiments = selectedExperiments.filter(expId => !EXPERIMENTS[expId]);
    if (invalidExperiments.length > 0) {
      console.error('❌ Invalid experiments:', invalidExperiments);
      alert('Error: Invalid experiments selected');
      return;
    }
    
    // Create competition
    competition.mode = 'class';
    competition.selectedExperiments = selectedExperiments;
    competition.code = generateRandomCode();
    competition.students = {};
    competition.startTime = Date.now();
    
    console.log('✅ Competition created:', {
      code: competition.code,
      experiments: competition.selectedExperiments,
      count: competition.selectedExperiments.length
    });
    
    saveCompetitionData();

    // Show monitoring view with smooth transition
    const createBtn = document.getElementById('createCompetitionBtn');
    const teacherForm = document.getElementById('teacherForm');
    const teacherMonitoring = document.getElementById('teacherMonitoring');
    
    if (createBtn) createBtn.style.display = 'none';
    if (teacherForm) teacherForm.style.display = 'none';
    if (teacherMonitoring) teacherMonitoring.removeAttribute('hidden');
    
    const codeEl = document.getElementById('competitionCode');
    if (codeEl) codeEl.textContent = competition.code;
    
    // Show success feedback
    sound.success();
    vibrate([30, 50, 30]);
    
    // Start polling for leaderboard updates
    console.log('📊 Starting leaderboard polling...');
    if (leaderboardInterval) clearInterval(leaderboardInterval);
    leaderboardInterval = setInterval(() => {
      console.log('🔄 Polling leaderboard...');
      loadCompetitionData();
      updateTeacherLeaderboard();
    }, 1000);
    
    updateTeacherLeaderboard();
    console.log('✅ Teacher monitoring view displayed');
  }

  function updateTeacherLeaderboard() {
    const leaderboard = document.getElementById('teacherLeaderboard');
    if (!leaderboard) {
      console.warn('⚠️ Leaderboard element not found');
      return;
    }

    const students = Object.entries(competition.students)
      .sort((a, b) => {
        // Sort by completion progress (descending), then by start time (ascending)
        if (b[1].completed !== a[1].completed) return b[1].completed - a[1].completed;
        return a[1].startTime - b[1].startTime;
      });

    if (students.length === 0) {
      leaderboard.innerHTML = `
        <div class="leaderboard-empty">
          ⏳ ${I18N[state.lang].msg_waiting || 'Waiting for students to join...'}
        </div>
      `;
      return;
    }

    const totalExperiments = competition.selectedExperiments.length;
    
    leaderboard.innerHTML = students.map((entry, idx) => {
      const [name, data] = entry;
      const percentage = Math.round((data.completed / totalExperiments) * 100);
      const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '•';
      const status = data.completed === totalExperiments ? '✅' : '⏳';
      
      return `
        <div class="leaderboard-row" style="opacity: ${1 - (idx * 0.05)}">
          <div class="leaderboard-rank">${medal} #${idx + 1}</div>
          <div class="leaderboard-name">${name}</div>
          <div class="leaderboard-progress">
            <span>${data.completed}/${totalExperiments}</span>
            <span class="progress-bar" style="width: ${percentage}%"></span>
          </div>
          <div class="leaderboard-status">${status}</div>
        </div>
      `;
    }).join('');
    
    console.log(`📊 Leaderboard updated: ${students.length} students`);
  }

  function handleStudentJoin() {
    console.log('👨‍🎓 Student joining competition...');
    
    const code = document.getElementById('joinCode').value.toUpperCase().trim();
    const name = document.getElementById('studentName').value.trim();
    const error = document.getElementById('joinError');

    // Clear previous error
    if (error) {
      error.setAttribute('hidden', '');
      error.textContent = '';
    }

    // Validate inputs
    if (!code || !name) {
      const msg = I18N[state.lang].msg_fill_fields || 'Please fill in both fields';
      if (error) {
        error.textContent = msg;
        error.removeAttribute('hidden');
      }
      console.warn('❌ Missing fields:', { code: !!code, name: !!name });
      return;
    }

    // Validate code format
    if (code.length !== 8) {
      const msg = I18N[state.lang].msg_invalid_code || 'Invalid code format';
      if (error) {
        error.textContent = msg;
        error.removeAttribute('hidden');
      }
      console.warn('❌ Invalid code format:', code);
      return;
    }

    // Load teacher's competition data
    loadCompetitionData();
    console.log('📊 Loaded competition data:', {
      code: competition.code,
      selectedExperiments: competition.selectedExperiments,
      students: Object.keys(competition.students)
    });

    // Validate competition code
    if (competition.code !== code) {
      const msg = I18N[state.lang].msg_invalid_code || 'Invalid competition code';
      if (error) {
        error.textContent = msg;
        error.removeAttribute('hidden');
      }
      console.error('❌ Code mismatch. Expected:', competition.code, 'Got:', code);
      return;
    }

    // Validate that experiments exist
    if (!competition.selectedExperiments || competition.selectedExperiments.length === 0) {
      const msg = 'No experiments in this competition';
      if (error) {
        error.textContent = msg;
        error.removeAttribute('hidden');
      }
      console.error('❌ No selected experiments');
      return;
    }

    // Register student
    competition.mode = 'class';
    competition.studentName = name;
    if (!competition.students[name]) {
      competition.students[name] = {
        completed: 0,
        startTime: Date.now(),
        experiments: []
      };
      console.log('✅ New student registered:', name);
    } else {
      console.log('✅ Student already exists:', name);
    }
    saveCompetitionData();

    // Hide experiments that are not selected
    console.log('🔍 Filtering experiments:', competition.selectedExperiments);
    const cards = document.querySelectorAll('[data-experiment]');
    let shown = 0;
    let hidden = 0;
    
    cards.forEach((card) => {
      const expId = card.dataset.experiment;
      if (competition.selectedExperiments.includes(expId)) {
        card.style.display = 'block';
        shown++;
      } else {
        card.style.display = 'none';
        hidden++;
      }
    });
    
    console.log(`✅ Experiment filtering: ${shown} shown, ${hidden} hidden`);

    // Clear input fields
    document.getElementById('joinCode').value = '';
    document.getElementById('studentName').value = '';

    // Show experiments page
    state.currentExperimentId = null;
    
    // Show success feedback
    sound.success();
    vibrate([30, 50, 30]);
    
    console.log('✅ Student joined successfully, showing experiments page');
    showPage('experiments');
  }

  function handleStudentExperimentComplete(experimentId) {
    if (!competition.studentName) {
      console.warn('⚠️ No student name set');
      return;
    }
    
    if (!competition.students[competition.studentName]) {
      console.error('❌ Student not found:', competition.studentName);
      return;
    }

    const student = competition.students[competition.studentName];
    
    if (!student.experiments.includes(experimentId)) {
      student.experiments.push(experimentId);
      student.completed = student.experiments.filter(
        expId => competition.selectedExperiments.includes(expId)
      ).length;
      
      console.log(`✅ Experiment completed: ${experimentId}`);
      console.log(`📊 Student progress: ${student.completed}/${competition.selectedExperiments.length}`);
      
      saveCompetitionData();
      console.log('✅ Competition data saved');
      // Note: Teacher's leaderboard will update via polling
    } else {
      console.log(`⚠️ Experiment already completed: ${experimentId}`);
    }
  }

  function handleEndCompetition() {
    const confirmMsg = I18N[state.lang].msg_confirm_end || 'End this competition? This cannot be undone.';
    
    if (confirm(confirmMsg)) {
      console.log('🛑 Ending competition...');
      
      // Store final results
      const finalStudents = { ...competition.students };
      const finalCode = competition.code;
      
      // Clear competition data
      competition.mode = null;
      competition.code = null;
      competition.studentName = null;
      competition.selectedExperiments = [];
      competition.students = {};
      
      saveCompetitionData();
      
      // Reset page
      const createBtn = document.getElementById('createCompetitionBtn');
      const teacherForm = document.getElementById('teacherForm');
      const teacherMonitoring = document.getElementById('teacherMonitoring');
      
      if (createBtn) createBtn.style.display = 'block';
      if (teacherForm) teacherForm.style.display = 'block';
      if (teacherMonitoring) teacherMonitoring.setAttribute('hidden', '');
      
      // Show feedback
      sound.success();
      vibrate([30, 50, 30]);
      
      console.log('✅ Competition ended:', {
        code: finalCode,
        students: Object.keys(finalStudents),
        totalStudents: Object.keys(finalStudents).length
      });
      
      showPage('home');
    }
  }

  // ⚠️ ALL LISTENERS MOVED TO init() — must be after DOM is ready

  document.addEventListener('DOMContentLoaded', init);
})();
