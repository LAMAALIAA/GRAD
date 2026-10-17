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

  // Classroom-sized cap for Class Competition — keeps the teacher's live
  // view readable and gives students a clear "sorry, full" message instead
  // of silently piling in. Declared up here (not down by the rest of the
  // competition code) so it's already initialized by the time the i18n
  // patches below build a message string that includes it.
  const MAX_STUDENTS_PER_COMPETITION = 30;

  // Supported UI languages, in the order the language button cycles through
  // them (en → ar → fr → en …). Adding another language later means adding
  // its code here plus an `I18N.<code>` dictionary and a `<code>:` entry on
  // every CHEMICALS / EXPERIMENTS / FREE_REACTIONS text field.
  const LANG_CYCLE = ['en', 'ar', 'fr'];
  const nextLang = (current) => LANG_CYCLE[(LANG_CYCLE.indexOf(current) + 1) % LANG_CYCLE.length];

  /* ----------------------------------------------------------------
     1. APP STATE
     One place holding everything that can change at runtime.
  ---------------------------------------------------------------- */
  const state = {
    lang: localStorage.getItem('chemlab_lang') || 'en',
    soundOn: true,
    score: parseInt(localStorage.getItem('chemlab_score') || '0', 10),
    completed: JSON.parse(localStorage.getItem('chemlab_completed') || '[]'),
    discovered: JSON.parse(localStorage.getItem('chemlab_discovered') || '[]'), // compounds created by mixing in Free Lab
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
  "en": {
    "msg_added": (chem) => `Added ${chem} to the glassware.`,
    "brand": "ChemLab<em>2D</em>",
    "loading": "Preparing the lab…",
    "nav_home": "Home",
    "nav_experiments": "Experiments",
    "nav_lab": "Virtual Lab",
    "hero_cta": "⚗️ Enter the Lab",
    "stat_experiments": "Guided experiments",
    "stat_risk": "Real-world risk",
    "stat_access": "Lab access",
    "about_title": "About the Lab",
    "about_sub": "ChemLab2D pairs every reaction with the “why” behind it, so experimenting never gets disconnected from understanding.",
    "feat1_title": "Zero-risk safety",
    "feat1_body": "Practice hazardous combinations and their warnings without any real danger.",
    "feat2_title": "Guided explanations",
    "feat2_body": "Every reaction explains what happened and why, in plain language.",
    "feat3_title": "Track your progress",
    "feat3_body": "Earn scores, complete experiments, and watch your progress bar fill up.",
    "feat4_title": "Bilingual interface",
    "feat4_body": "Switch instantly between English and Arabic, with full RTL support.",
    "about_eyebrow": "KEY FEATURES",
    "exp_eyebrow": "CHOOSE AN EXPERIMENT",
    "exp_title": "Experiment Selection",
    "exp_sub": "Pick a guided experiment. Each one drops you straight onto the lab bench.",
    "diff_easy": "Easy",
    "diff_medium": "Medium",
    "diff_hard": "Hard",
    "exp1_name": "Acid + Base Neutralization",
    "exp1_desc": "Combine hydrochloric acid and sodium hydroxide and watch the indicator change color.",
    "exp2_name": "Vinegar + Baking Soda",
    "exp2_desc": "A classic acid-carbonate reaction that releases carbon dioxide gas bubbles.",
    "exp3_name": "Copper Sulfate Reaction",
    "exp3_desc": "Add iron to copper sulfate solution and observe a precipitate form.",
    "exp4_name": "Elephant Toothpaste",
    "exp4_desc": "Mix hydrogen peroxide with a catalyst and watch a giant foam erupt.",
    "exp5_name": "Dry Ice Fog",
    "exp5_desc": "Drop dry ice into warm water and watch thick white fog billow out.",
    "exp6_name": "Glowing Luminol",
    "exp6_desc": "Combine luminol with an oxidizer and watch it glow blue-green.",
    "completed_tag": "Completed",
    "start_btn": "Start",
    "back_btn": "← Back",
    "hint_btn": "💡 Hint",
    "reset_btn": "↺ Reset",
    "handtrack_btn": "🖐️ Hand Control",
    "lab_default_title": "Free Mix",
    "shelf_title": "Chemicals",
    "label_beaker": "Beaker",
    "label_testtube": "Test Tube",
    "label_flask": "Flask",
    "panel_messages": "Lab Messages",
    "msg_welcome": "Drag (or tap) a chemical bottle, then tap a piece of glassware to add it.",
    "panel_score": "Score & Progress",
    "score_label": "Score",
    "completed_label": "Completed",
    "safety_title": "🧪 Lab Safety Instructions",
    "safety1": "Always add acid to water, never water to acid.",
    "safety2": "Never mix bleach-type and ammonia-type chemicals.",
    "safety3": "Watch for temperature warnings — step away from exothermic reactions.",
    "safety4": "Wear goggles and gloves in a real laboratory at all times.",
    "safety5": "This simulator blocks unsafe combinations so you can learn why they're dangerous.",
    "got_it_btn": "Got it",
    "hint_title": "💡 Hint",
    "hint_default": "Select an experiment first to get a tailored hint.",
    "close_btn": "Close",
    "result_default_title": "Result",
    "try_again_btn": "Try Again",
    "next_btn": "Next Experiment",
    "footer_text": "ChemLab2D — a safe space to think like a chemist.",
    "msg_already": "That chemical is already in there — add a different one to react.",
    "msg_wrong_start": "Combination result: ",
    "full_note": "This piece of glassware already has a result — press Reset to try again.",
    "mode_title": "How do you want to use the Lab?",
    "mode_solo_title": "Solo Exploration",
    "mode_solo_desc": "Learn at your own pace",
    "mode_free_title": "Free Lab",
    "mode_free_desc": "Mix & discover with AI",
    "mode_class_title": "Class Competition",
    "mode_class_desc": "Team challenge with friends",
    "class_mode_title": "Class Competition Mode",
    "teacher_role": "Teacher/Leader",
    "teacher_role_desc": "Create & monitor competition",
    "student_role": "Student/Participant",
    "student_role_desc": "Join with code & compete",
    "teacher_title": "Create a Class Competition",
    "teacher_select_exp": "Select Experiments:",
    "teacher_create": "Create Competition",
    "teacher_share_code": "Share this code with students:",
    "teacher_students": "Students & Results",
    "teacher_end": "End Competition",
    "student_title": "Join a Class Competition",
    "student_enter_code": "Enter Competition Code:",
    "student_enter_name": "Your Name:",
    "student_join": "Join Competition",
    "msg_select_exp": "Please select at least one experiment",
    "msg_fill_fields": "Please fill in both fields",
    "msg_invalid_code": "Invalid competition code",
    "msg_confirm_end": "End this competition?",
    "free_title": "Free Chemistry Lab",
    "free_desc": "Mix any chemicals and discover reactions with AI predictions",
    "free_choose_vessel": "Choose Your Vessel",
    "free_select_chemicals": "Select Chemicals (in mL)",
    "free_mix_btn": "🧬 Mix & Discover",
    "free_analyzing": "Analyzing reaction...",
    "free_history": "Reaction History",
    "free_no_history": "No reactions yet"
  },
  "ar": {
    "msg_added": (chem) => `تمت إضافة ${chem} إلى الأداة الزجاجية.`,
    "brand": "مختبر<em>الكيمياء</em>",
    "loading": "جاري تجهيز المختبر…",
    "nav_home": "الرئيسية",
    "nav_experiments": "التجارب",
    "nav_lab": "المختبر الافتراضي",
    "hero_cta": "⚗️ ادخل المختبر",
    "stat_experiments": "تجارب موجّهة",
    "stat_risk": "مخاطر واقعية",
    "stat_access": "إتاحة المختبر",
    "about_title": "عن المختبر",
    "about_sub": "يربط مختبر الكيمياء كل تفاعل بسبب حدوثه، حتى لا تنفصل التجربة عن الفهم أبدًا.",
    "feat1_title": "أمان بلا مخاطر",
    "feat1_body": "جرّب التركيبات الخطرة وتحذيراتها دون أي خطر حقيقي.",
    "feat2_title": "تفسيرات موجّهة",
    "feat2_body": "كل تفاعل يُشرح لك ماذا حدث ولماذا، بلغة بسيطة.",
    "feat3_title": "تتبّع تقدّمك",
    "feat3_body": "اجمع النقاط، أكمل التجارب، وشاهد شريط تقدّمك يمتلئ.",
    "feat4_title": "واجهة ثنائية اللغة",
    "feat4_body": "بدّل فورًا بين الإنجليزية والعربية مع دعم كامل للاتجاه من اليمين لليسار.",
    "about_eyebrow": "المميزات الرئيسية",
    "exp_eyebrow": "اختر تجربة",
    "exp_title": "اختيار التجربة",
    "exp_sub": "اختر تجربة موجّهة، وستنتقل مباشرة إلى منضدة المختبر.",
    "diff_easy": "سهل",
    "diff_medium": "متوسط",
    "diff_hard": "صعب",
    "exp1_name": "تعادل حمض وقاعدة",
    "exp1_desc": "امزج حمض الهيدروكلوريك مع هيدروكسيد الصوديوم وشاهد تغيّر لون الكاشف.",
    "exp2_name": "الخل وبيكربونات الصوديوم",
    "exp2_desc": "تفاعل كلاسيكي بين حمض وكربونات يُطلق فقاعات غاز ثاني أكسيد الكربون.",
    "exp3_name": "تفاعل كبريتات النحاس",
    "exp3_desc": "أضف الحديد إلى محلول كبريتات النحاس وشاهد تكوّن راسب.",
    "exp4_name": "معجون أسنان الفيل",
    "exp4_desc": "امزج بيروكسيد الهيدروجين مع عامل حفّاز وشاهد رغوة ضخمة تنفجر.",
    "exp5_name": "ضباب الثلج الجاف",
    "exp5_desc": "أسقط الثلج الجاف في ماء دافئ وشاهد ضبابًا أبيض كثيفًا يتصاعد.",
    "exp6_name": "اللومينول المتوهج",
    "exp6_desc": "امزج اللومينول مع مؤكسد وشاهده يتوهج بلون أزرق مخضر.",
    "completed_tag": "مكتملة",
    "start_btn": "ابدأ",
    "back_btn": "→ رجوع",
    "hint_btn": "💡 تلميح",
    "reset_btn": "↺ إعادة ضبط",
    "handtrack_btn": "🖐️ تحكم باليد",
    "lab_default_title": "مزج حر",
    "shelf_title": "المواد الكيميائية",
    "label_beaker": "كأس زجاجي",
    "label_testtube": "أنبوب اختبار",
    "label_flask": "دورق",
    "panel_messages": "رسائل المختبر",
    "msg_welcome": "اسحب (أو اضغط على) زجاجة مادة كيميائية، ثم اضغط على أداة زجاجية لإضافتها.",
    "panel_score": "النقاط والتقدّم",
    "score_label": "النقاط",
    "completed_label": "المكتمل",
    "safety_title": "🧪 تعليمات السلامة في المختبر",
    "safety1": "أضف الحمض دائمًا إلى الماء، ولا تفعل العكس أبدًا.",
    "safety2": "لا تمزج أبدًا مواد كلورية مع مواد أمونيا.",
    "safety3": "انتبه لتحذيرات الحرارة — ابتعد عن التفاعلات الطاردة للحرارة.",
    "safety4": "ارتدِ النظارات والقفازات دائمًا في المختبر الحقيقي.",
    "safety5": "هذا المحاكي يمنع التركيبات غير الآمنة لتتعلم لماذا هي خطرة.",
    "got_it_btn": "حسنًا",
    "hint_title": "💡 تلميح",
    "hint_default": "اختر تجربة أولًا للحصول على تلميح مخصص.",
    "close_btn": "إغلاق",
    "result_default_title": "النتيجة",
    "try_again_btn": "حاول مجددًا",
    "next_btn": "التجربة التالية",
    "footer_text": "مختبر الكيمياء الافتراضي — مساحة آمنة للتفكير كعالم كيمياء.",
    "msg_already": "هذه المادة موجودة بالفعل — أضف مادة مختلفة لحدوث تفاعل.",
    "msg_wrong_start": "نتيجة التركيبة: ",
    "full_note": "هذه الأداة الزجاجية تحتوي على نتيجة بالفعل — اضغط \"إعادة ضبط\" للمحاولة مجددًا.",
    "mode_title": "كيف تريد استخدام المختبر؟",
    "mode_solo_title": "استكشاف فردي",
    "mode_solo_desc": "تعلّم بوتيرتك الخاصة",
    "mode_free_title": "مختبر حر",
    "mode_free_desc": "اخلط واكتشف مع الذكاء الاصطناعي",
    "mode_class_title": "مسابقة فصل",
    "mode_class_desc": "تحدّ مع الأصدقاء",
    "class_mode_title": "وضع مسابقة الفصل",
    "teacher_role": "معلم / قائد",
    "teacher_role_desc": "إنشاء ومراقبة المسابقة",
    "student_role": "طالب / مشارك",
    "student_role_desc": "ادخل برمز والمع",
    "teacher_title": "إنشاء مسابقة فصل",
    "teacher_select_exp": "اختر التجارب:",
    "teacher_create": "إنشاء مسابقة",
    "teacher_share_code": "شارك هذا الرمز مع الطلاب:",
    "teacher_students": "الطلاب والنتائج",
    "teacher_end": "إنهاء المسابقة",
    "student_title": "ادخل مسابقة فصل",
    "student_enter_code": "أدخل رمز المسابقة:",
    "student_enter_name": "اسمك:",
    "student_join": "ادخل المسابقة",
    "msg_select_exp": "يرجى اختيار تجربة واحدة على الأقل",
    "msg_fill_fields": "يرجى ملء كلا الحقلين",
    "msg_invalid_code": "رمز مسابقة غير صحيح",
    "msg_confirm_end": "إنهاء هذه المسابقة؟",
    "free_title": "مختبر الكيمياء الحر",
    "free_desc": "اخلط أي كيميائيات واكتشف التفاعلات مع توقعات الذكاء الاصطناعي",
    "free_choose_vessel": "اختر الأداة الزجاجية",
    "free_select_chemicals": "اختر المواد الكيميائية (بالملليتر)",
    "free_mix_btn": "🧬 اخلط واكتشف",
    "free_analyzing": "تحليل التفاعل...",
    "free_history": "سجل التفاعلات",
    "free_no_history": "لا توجد تفاعلات حتى الآن",
    "select_apparatus": "اختر الأنبوب:",
    "lab_free_description": "اخلط العناصر لاكتشاف تفاعلات جديدة!",
    "msg_welcome_free": "اسحب عنصرًا من الرف واضغط على الأنبوب المختار لإضافته.",
    "msg_free_no_reaction": "لا يوجد تفاعل — جرّب عناصر مختلفة!"
  },
  "fr": {
    "msg_added": (chem) => `${chem} ajouté à la verrerie.`,
    "brand": "ChemLab<em>2D</em>",
    "loading": "Préparation du labo…",
    "nav_home": "Accueil",
    "nav_experiments": "Expériences",
    "nav_lab": "Labo Virtuel",
    "hero_cta": "⚗️ Entrer dans le labo",
    "stat_experiments": "Expériences guidées",
    "stat_risk": "Risque réel",
    "stat_access": "Accès au labo",
    "about_title": "À propos du labo",
    "about_sub": "ChemLab2D associe chaque réaction à son « pourquoi », pour que l'expérimentation reste toujours liée à la compréhension.",
    "feat1_title": "Sécurité sans risque",
    "feat1_body": "Pratique des combinaisons dangereuses et leurs avertissements, sans aucun danger réel.",
    "feat2_title": "Explications guidées",
    "feat2_body": "Chaque réaction explique ce qui s'est passé et pourquoi, en langage clair.",
    "feat3_title": "Suis ta progression",
    "feat3_body": "Gagne des points, termine des expériences, et regarde ta barre de progression se remplir.",
    "feat4_title": "Interface bilingue",
    "feat4_body": "Passe instantanément de l'anglais à l'arabe, avec prise en charge complète du RTL.",
    "about_eyebrow": "FONCTIONNALITÉS CLÉS",
    "exp_eyebrow": "CHOISIS UNE EXPÉRIENCE",
    "exp_title": "Sélection d'expérience",
    "exp_sub": "Choisis une expérience guidée. Chacune te place directement sur la paillasse du labo.",
    "diff_easy": "Facile",
    "diff_medium": "Moyen",
    "diff_hard": "Difficile",
    "exp1_name": "Neutralisation acide-base",
    "exp1_desc": "Combine de l'acide chlorhydrique et de l'hydroxyde de sodium, et observe l'indicateur changer de couleur.",
    "exp2_name": "Vinaigre + Bicarbonate de soude",
    "exp2_desc": "Une réaction acide-carbonate classique qui libère des bulles de dioxyde de carbone.",
    "exp3_name": "Réaction du sulfate de cuivre",
    "exp3_desc": "Ajoute du fer à une solution de sulfate de cuivre et observe un précipité se former.",
    "exp4_name": "Dentifrice d'éléphant",
    "exp4_desc": "Mélange du peroxyde d'hydrogène avec un catalyseur et regarde une mousse géante jaillir.",
    "exp5_name": "Brouillard de glace carbonique",
    "exp5_desc": "Dépose de la glace carbonique dans de l'eau tiède et regarde un épais brouillard blanc se répandre.",
    "exp6_name": "Luminol lumineux",
    "exp6_desc": "Combine du luminol avec un oxydant et regarde-le briller en bleu-vert.",
    "completed_tag": "Terminé",
    "start_btn": "Commencer",
    "back_btn": "← Retour",
    "hint_btn": "💡 Indice",
    "reset_btn": "↺ Réinitialiser",
    "handtrack_btn": "🖐️ Contrôle par la main",
    "lab_default_title": "Mélange libre",
    "shelf_title": "Produits chimiques",
    "label_beaker": "Bécher",
    "label_testtube": "Tube à essai",
    "label_flask": "Fiole",
    "panel_messages": "Messages du labo",
    "msg_welcome": "Fais glisser (ou touche) un flacon chimique, puis touche une pièce de verrerie pour l'ajouter.",
    "panel_score": "Score et progression",
    "score_label": "Score",
    "completed_label": "Terminées",
    "safety_title": "🧪 Consignes de sécurité du labo",
    "safety1": "Toujours ajouter l'acide à l'eau, jamais l'eau à l'acide.",
    "safety2": "Ne jamais mélanger des produits de type eau de Javel et de type ammoniaque.",
    "safety3": "Surveille les avertissements de température — éloigne-toi des réactions exothermiques.",
    "safety4": "Porte toujours des lunettes et des gants dans un vrai laboratoire.",
    "safety5": "Ce simulateur bloque les combinaisons dangereuses pour que tu comprennes pourquoi elles le sont.",
    "got_it_btn": "Compris",
    "hint_title": "💡 Indice",
    "hint_default": "Sélectionne d'abord une expérience pour obtenir un indice adapté.",
    "close_btn": "Fermer",
    "result_default_title": "Résultat",
    "try_again_btn": "Réessayer",
    "next_btn": "Expérience suivante",
    "footer_text": "ChemLab2D — un espace sûr pour penser comme un chimiste.",
    "msg_already": "Ce produit chimique est déjà là-dedans — ajoute-en un autre pour réagir.",
    "msg_wrong_start": "Résultat de la combinaison : ",
    "full_note": "Cette pièce de verrerie a déjà un résultat — appuie sur Réinitialiser pour réessayer.",
    "mode_title": "Comment veux-tu utiliser le labo ?",
    "mode_solo_title": "Exploration en solo",
    "mode_solo_desc": "Apprends à ton propre rythme",
    "mode_free_title": "Labo libre",
    "mode_free_desc": "Mélange et découvre par toi-même",
    "mode_class_title": "Compétition de classe",
    "mode_class_desc": "Défi en équipe avec des amis",
    "class_mode_title": "Mode Compétition de classe",
    "teacher_role": "Enseignant·e / Animateur·rice",
    "teacher_role_desc": "Crée et surveille la compétition",
    "student_role": "Élève / Participant·e",
    "student_role_desc": "Rejoins avec un code et participe",
    "teacher_title": "Créer une compétition de classe",
    "teacher_select_exp": "Sélectionner les expériences :",
    "teacher_create": "Créer la compétition",
    "teacher_share_code": "Partage ce code avec les élèves :",
    "teacher_students": "Élèves et résultats",
    "teacher_end": "Terminer la compétition",
    "student_title": "Rejoindre une compétition de classe",
    "student_enter_code": "Entre le code de la compétition :",
    "student_enter_name": "Ton nom :",
    "student_join": "Rejoindre la compétition",
    "msg_select_exp": "Merci de sélectionner au moins une expérience",
    "msg_fill_fields": "Merci de remplir les deux champs",
    "msg_invalid_code": "Code de compétition invalide",
    "msg_confirm_end": "Terminer cette compétition ?",
    "free_title": "Labo de chimie libre",
    "free_desc": "Mélange n'importe quels produits chimiques et découvre des réactions",
    "free_choose_vessel": "Choisis ton récipient",
    "free_select_chemicals": "Sélectionne les produits chimiques (en mL)",
    "free_mix_btn": "🧬 Mélanger et découvrir",
    "free_analyzing": "Analyse de la réaction…",
    "free_history": "Historique des réactions",
    "free_no_history": "Aucune réaction pour l'instant"
  }
};

  // === TRANSLATE PREVIOUS "en:" ENTRIES TO ADD NEW KEYS ===
  I18N.en.select_apparatus = 'Choose Container:';
  I18N.en.lab_free_description = 'Mix elements to see what happens!';
  I18N.en.msg_welcome_free = 'Select a container above, then drag elements to mix & discover reactions!';
  I18N.ar.msg_welcome_free = 'اختر أداة زجاجية أعلاه، ثم اسحب العناصر لاختلاطها واكتشاف التفاعلات!';
  
  I18N.en.msg_free_no_reaction = 'No reaction detected — try different elements!';
  I18N.ar.msg_free_no_reaction = 'لا يوجد تفاعل — جرب عناصر مختلفة!';
  
  I18N.en.select_container = 'Select a container to add elements';
  I18N.ar.select_container = 'اختر أداة زجاجية لإضافة عناصر';
  
  I18N.en.element_info = 'Element: ';
  I18N.ar.element_info = 'العنصر: ';

  I18N.en.msg_cloud_unavailable = 'Could not connect to the server — check your internet connection and reload the page.';
  I18N.ar.msg_cloud_unavailable = 'تعذر الاتصال بالخادم — تحققي من اتصال الإنترنت وأعيدي تحميل الصفحة.';

  // First-visit tutorial
  I18N.en.tut_welcome = '👋 Welcome to Virtual Chemistry Lab! Want a 1-minute tour before you dive in?';
  I18N.en.tut_start = 'Start Tour';
  I18N.en.tut_skip = 'Skip';
  I18N.en.tut_next = 'Next';
  I18N.en.tut_mode_solo = 'Guided Experiments — follow clear steps, with a scientific explanation for every result.';
  I18N.en.tut_mode_free = 'Free Lab — mix any elements freely and discover new substances on your own.';
  I18N.en.tut_mode_class = "Class Competition — a teacher sets up a challenge, and students join from their own devices and race to finish.";
  I18N.en.tut_before_water = "Now let's make your first discovery together — Water! 💧";
  I18N.en.tut_lets_go = "Let's go!";
  I18N.en.tut_drag_h = 'Drag (or tap) the Hydrogen bottle into the beaker';
  I18N.en.tut_drag_o = 'Great! Now add Oxygen the same way';
  I18N.en.tut_done = "🎉 You did it! That's how every experiment works — pick a container, add the right elements, and discover what happens. Have fun exploring!";
  I18N.en.tut_finish = 'Start Exploring';

  I18N.ar.tut_welcome = '👋 أهلاً فيكِ بالمختبر الكيميائي الافتراضي! تبين جولة سريعة قبل ما تبدئين؟';
  I18N.ar.tut_start = 'ابدئي الجولة';
  I18N.ar.tut_skip = 'تخطي';
  I18N.ar.tut_next = 'التالي';
  I18N.ar.tut_mode_solo = 'تجارب موجهة — اتبعي خطوات واضحة، مع شرح علمي لكل نتيجة.';
  I18N.ar.tut_mode_free = 'اللعب الحر — اخلطي أي عناصر بحرية واكتشفي مواد جديدة بنفسك.';
  I18N.ar.tut_mode_class = 'منافسة الصف — المعلم ينشئ تحدي، والطلاب ينضمون من أجهزتهم ويتسابقون للإنهاء.';
  I18N.ar.tut_before_water = 'الحين خلينا نسوي أول اكتشاف سوا — الماء! 💧';
  I18N.ar.tut_lets_go = 'يلا نبدأ!';
  I18N.ar.tut_drag_h = 'اسحبي (أو اضغطي) زجاجة الهيدروجين وحطيها بالكأس';
  I18N.ar.tut_drag_o = 'ممتاز! الحين ضيفي الأكسجين بنفس الطريقة';
  I18N.ar.tut_done = '🎉 أحسنتِ! كذا بالضبط تسير أي تجربة — اختاري أداة، ضيفي العناصر الصحيحة، واكتشفي النتيجة. استمتعي بالاستكشاف!';
  I18N.ar.tut_finish = 'ابدئي الاستكشاف';

  I18N.en.student_count_label = 'joined';
  I18N.ar.student_count_label = 'منضم';
  I18N.en.msg_competition_full = `This competition is full (max ${MAX_STUDENTS_PER_COMPETITION} students)`;
  I18N.ar.msg_competition_full = `المنافسة وصلت للحد الأقصى (${MAX_STUDENTS_PER_COMPETITION} طالب)`;
  I18N.en.msg_free_no_reaction = 'No reaction — try different elements!';
  I18N.fr.select_apparatus = "Choisis un récipient :";
  I18N.fr.lab_free_description = "Mélange des éléments pour voir ce qui se passe !";
  I18N.fr.msg_welcome_free = "Sélectionne un récipient ci-dessus, puis fais glisser des éléments pour mélanger et découvrir des réactions !";
  I18N.fr.msg_free_no_reaction = "Aucune réaction — essaie d'autres éléments !";
  I18N.fr.select_container = "Sélectionne un récipient pour ajouter des éléments";
  I18N.fr.element_info = "Élément : ";
  I18N.fr.msg_cloud_unavailable = "Impossible de se connecter au serveur — vérifie ta connexion internet et recharge la page.";
  I18N.fr.tut_welcome = "👋 Bienvenue au Labo de Chimie Virtuel ! Tu veux une visite rapide d'une minute avant de commencer ?";
  I18N.fr.tut_start = "Démarrer la visite";
  I18N.fr.tut_skip = "Passer";
  I18N.fr.tut_next = "Suivant";
  I18N.fr.tut_mode_solo = "Expériences guidées — suis des étapes claires, avec une explication scientifique pour chaque résultat.";
  I18N.fr.tut_mode_free = "Labo libre — mélange librement n'importe quels éléments et découvre de nouvelles substances par toi-même.";
  I18N.fr.tut_mode_class = "Compétition de classe — un·e enseignant·e crée un défi, et les élèves rejoignent depuis leurs propres appareils et s'affrontent pour finir les premiers.";
  I18N.fr.tut_before_water = "Faisons maintenant notre première découverte ensemble — l'Eau ! 💧";
  I18N.fr.tut_lets_go = "C'est parti !";
  I18N.fr.tut_drag_h = "Fais glisser (ou touche) le flacon d'Hydrogène dans le bécher";
  I18N.fr.tut_drag_o = "Super ! Ajoute maintenant l'Oxygène de la même façon";
  I18N.fr.tut_done = "🎉 Bravo, tu l'as fait ! C'est comme ça que fonctionne chaque expérience — choisis un récipient, ajoute les bons éléments, et découvre ce qui se passe. Amuse-toi à explorer !";
  I18N.fr.tut_finish = "Commencer à explorer";
  I18N.fr.student_count_label = "inscrit(s)";
  I18N.fr.msg_competition_full = `Cette compétition est complète (max ${MAX_STUDENTS_PER_COMPETITION} élèves)`;

  // Experiment-grid card titles/descriptions and footer credit (previously hardcoded English in index.html)
  I18N.en.card_starch_iodine_name = "Starch + Iodine";
  I18N.ar.card_starch_iodine_name = "النشا + اليود";
  I18N.fr.card_starch_iodine_name = "Amidon + Iode";
  I18N.en.card_starch_iodine_desc = "Classic blue-black color change test!";
  I18N.ar.card_starch_iodine_desc = "اختبار تغيّر اللون الكلاسيكي إلى الأزرق-الأسود!";
  I18N.fr.card_starch_iodine_desc = "Le test classique du changement de couleur bleu-noir !";
  I18N.en.card_zinc_copper_name = "Zinc + Copper Sulfate";
  I18N.ar.card_zinc_copper_name = "الزنك + كبريتات النحاس";
  I18N.fr.card_zinc_copper_name = "Zinc + Sulfate de cuivre";
  I18N.en.card_zinc_copper_desc = "Watch red copper metal coat the zinc.";
  I18N.ar.card_zinc_copper_desc = "شاهد معدن النحاس الأحمر يغطي الزنك.";
  I18N.fr.card_zinc_copper_desc = "Regarde le cuivre rouge recouvrir le zinc.";
  I18N.en.card_iron_sulfur_name = "Iron + Sulfur";
  I18N.ar.card_iron_sulfur_name = "الحديد + الكبريت";
  I18N.fr.card_iron_sulfur_name = "Fer + Soufre";
  I18N.en.card_iron_sulfur_desc = "Heat iron and sulfur to form black iron sulfide.";
  I18N.ar.card_iron_sulfur_desc = "سخّن الحديد والكبريت لتكوين كبريتيد الحديد الأسود.";
  I18N.fr.card_iron_sulfur_desc = "Chauffe le fer et le soufre pour former du sulfure de fer noir.";
  I18N.en.card_calcium_water_name = "Calcium + Water";
  I18N.ar.card_calcium_water_name = "الكالسيوم + الماء";
  I18N.fr.card_calcium_water_name = "Calcium + Eau";
  I18N.en.card_calcium_water_desc = "Calmer than sodium but still reactive — bubbling hydrogen!";
  I18N.ar.card_calcium_water_desc = "أهدأ من الصوديوم لكنه ما زال متفاعلاً — فقاعات هيدروجين!";
  I18N.fr.card_calcium_water_desc = "Plus calme que le sodium mais toujours réactif — de l'hydrogène qui bouillonne !";
  I18N.en.card_lead_iodide_name = "Lead Nitrate + Iodide";
  I18N.ar.card_lead_iodide_name = "نترات الرصاص + اليوديد";
  I18N.fr.card_lead_iodide_name = "Nitrate de plomb + Iodure";
  I18N.en.card_lead_iodide_desc = "Bright yellow precipitate forms instantly!";
  I18N.ar.card_lead_iodide_desc = "يتكوّن راسب أصفر ساطع فوراً!";
  I18N.fr.card_lead_iodide_desc = "Un précipité jaune vif se forme instantanément !";
  I18N.en.card_manganese_name = "MnO₂ Catalyst";
  I18N.ar.card_manganese_name = "محفّز MnO₂";
  I18N.fr.card_manganese_name = "Catalyseur MnO₂";
  I18N.en.card_manganese_desc = "Vigorous oxygen release with catalyst!";
  I18N.ar.card_manganese_desc = "انطلاق قوي للأكسجين بوجود المحفّز!";
  I18N.fr.card_manganese_desc = "Fort dégagement d'oxygène grâce au catalyseur !";
  I18N.en.card_sodium_water_name = "Sodium + Water";
  I18N.ar.card_sodium_water_name = "الصوديوم + الماء";
  I18N.fr.card_sodium_water_name = "Sodium + Eau";
  I18N.en.card_sodium_water_desc = "Vigorous reaction with flames — alkali metal warfare!";
  I18N.ar.card_sodium_water_desc = "تفاعل عنيف مع لهب — حرب الفلزات القلوية!";
  I18N.fr.card_sodium_water_desc = "Réaction violente avec des flammes — la guerre des métaux alcalins !";
  I18N.en.card_copper_nitric_name = "Copper + Nitric Acid";
  I18N.ar.card_copper_nitric_name = "النحاس + حمض النيتريك";
  I18N.fr.card_copper_nitric_name = "Cuivre + Acide nitrique";
  I18N.en.card_copper_nitric_desc = "Brown nitrogen dioxide gas — toxic fumes!";
  I18N.ar.card_copper_nitric_desc = "غاز ثاني أكسيد النيتروجين البني — أبخرة سامة!";
  I18N.fr.card_copper_nitric_desc = "Gaz brun de dioxyde d'azote — fumées toxiques !";
  I18N.en.card_sugar_sulfuric_name = "Sugar + Sulfuric Acid";
  I18N.ar.card_sugar_sulfuric_name = "السكر + حمض الكبريتيك";
  I18N.fr.card_sugar_sulfuric_name = "Sucre + Acide sulfurique";
  I18N.en.card_sugar_sulfuric_desc = "Dramatic dehydration to pure black carbon!";
  I18N.ar.card_sugar_sulfuric_desc = "تجفيف مذهل إلى كربون أسود نقي!";
  I18N.fr.card_sugar_sulfuric_desc = "Déshydratation spectaculaire en carbone noir pur !";
  I18N.en.card_aluminum_naoh_name = "Aluminum + NaOH";
  I18N.ar.card_aluminum_naoh_name = "الألومنيوم + NaOH";
  I18N.fr.card_aluminum_naoh_name = "Aluminium + NaOH";
  I18N.en.card_aluminum_naoh_desc = "Amphoteric metal reacts with bases!";
  I18N.ar.card_aluminum_naoh_desc = "فلز أمفوتيري يتفاعل مع القواعد!";
  I18N.fr.card_aluminum_naoh_desc = "Un métal amphotère qui réagit avec les bases !";
  I18N.en.footer_dev = "© Developed by";
  I18N.ar.footer_dev = "© تطوير";
  I18N.fr.footer_dev = "© Développé par";
  I18N.en.board_free_sub = "Discover reactions";
  I18N.ar.board_free_sub = "اكتشف التفاعلات";
  I18N.fr.board_free_sub = "Découvre des réactions";
  I18N.en.msg_selected = "Selected: ";
  I18N.ar.msg_selected = "تم اختيار: ";
  I18N.fr.msg_selected = "Sélectionné : ";

  /** Translate every [data-i18n] element + set <html lang/dir>. */
  function applyTranslations() {
    const dict = I18N[state.lang];
    document.documentElement.lang = state.lang;
    document.documentElement.dir = state.lang === 'ar' ? 'rtl' : 'ltr';
    // The button shows the language you'll switch TO next in the cycle.
    document.getElementById('langLabel').textContent = nextLang(state.lang).toUpperCase();

    // Change hero image based on language — each image already has its own
    // title baked into the artwork (English / Arabic), so no separate text
    // overlay is needed on top of either one.
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
  "hydrogen": {
    "name": {
      "en": "Hydrogen",
      "ar": "الهيدروجين",
      "fr": "Hydrogène"
    },
    "formula": "H",
    "bottleColor": "#60a5fa",
    "short": {
      "en": "H",
      "ar": "H",
      "fr": "H"
    },
    "info": {
      "en": "Colorless gas — the lightest element. Combines with oxygen to form water.",
      "ar": "غاز عديم اللون — أخف العناصر. يتحد مع الأكسجين لتكوين الماء.",
      "fr": "Gaz incolore — l'élément le plus léger. Se combine avec l'oxygène pour former de l'eau."
    }
  },
  "oxygen": {
    "name": {
      "en": "Oxygen",
      "ar": "الأكسجين",
      "fr": "Oxygène"
    },
    "formula": "O",
    "bottleColor": "#34d399",
    "short": {
      "en": "O",
      "ar": "O",
      "fr": "O"
    },
    "info": {
      "en": "Colorless gas — supports combustion. Essential for water and many compounds.",
      "ar": "غاز عديم اللون — يدعم الاحتراق. ضروري للماء والعديد من المركبات.",
      "fr": "Gaz incolore — entretient la combustion. Essentiel pour l'eau et de nombreux composés."
    }
  },
  "carbon": {
    "name": {
      "en": "Carbon",
      "ar": "الكربون",
      "fr": "Carbone"
    },
    "formula": "C",
    "bottleColor": "#1f2937",
    "short": {
      "en": "C",
      "ar": "C",
      "fr": "C"
    },
    "info": {
      "en": "Dark solid — basis of all organic molecules. Forms the backbone of life.",
      "ar": "مادة صلبة داكنة — أساس جميع الجزيئات العضوية. تشكل عمود الحياة.",
      "fr": "Solide foncé — base de toutes les molécules organiques. Constitue le squelette de la vie."
    }
  },
  "nitrogen": {
    "name": {
      "en": "Nitrogen",
      "ar": "النيتروجين",
      "fr": "Azote"
    },
    "formula": "N",
    "bottleColor": "#8b5cf6",
    "short": {
      "en": "N",
      "ar": "N",
      "fr": "N"
    },
    "info": {
      "en": "Colorless gas — makes up 78% of air. Essential for proteins and DNA.",
      "ar": "غاز عديم اللون — يشكل 78% من الهواء. ضروري للبروتينات والحمض النووي.",
      "fr": "Gaz incolore — compose 78% de l'air. Essentiel pour les protéines et l'ADN."
    }
  },
  "sodium": {
    "name": {
      "en": "Sodium",
      "ar": "الصوديوم",
      "fr": "Sodium"
    },
    "formula": "Na",
    "bottleColor": "#fbbf24",
    "short": {
      "en": "Na",
      "ar": "Na",
      "fr": "Na"
    },
    "info": {
      "en": "Silver metal — highly reactive, stored in oil. Essential for nerve signals.",
      "ar": "معدن فضي — نشط جداً، يُخزن في الزيت. ضروري لإشارات الأعصاب.",
      "fr": "Métal argenté — très réactif, conservé dans l'huile. Essentiel pour les signaux nerveux."
    }
  },
  "chlorine": {
    "name": {
      "en": "Chlorine",
      "ar": "الكلور",
      "fr": "Chlore"
    },
    "formula": "Cl",
    "bottleColor": "#f472b6",
    "short": {
      "en": "Cl",
      "ar": "Cl",
      "fr": "Cl"
    },
    "info": {
      "en": "Yellow-green toxic gas — used to disinfect water. Forms salts with metals.",
      "ar": "غاز سام أصفر-أخضر — يُستخدم لتطهير الماء. يكون ملاح مع المعادن.",
      "fr": "Gaz toxique jaune-vert — utilisé pour désinfecter l'eau. Forme des sels avec les métaux."
    }
  },
  "sulfur": {
    "name": {
      "en": "Sulfur Powder",
      "ar": "مسحوق الكبريت",
      "fr": "Soufre en poudre"
    },
    "formula": "S",
    "bottleColor": "#eab308",
    "short": {
      "en": "Non-metal",
      "ar": "لافلز",
      "fr": "Non-métal"
    },
    "info": {
      "en": "Yellow sulfur powder — when heated with iron, forms black iron sulfide.",
      "ar": "مسحوق كبريت أصفر — عند تسخينه مع الحديد، يكوّن كبريتيد الحديد الأسود.",
      "fr": "Poudre de soufre jaune — chauffée avec du fer, forme du sulfure de fer noir."
    }
  },
  "zinc": {
    "name": {
      "en": "Zinc Powder",
      "ar": "مسحوق الزنك",
      "fr": "Zinc en poudre"
    },
    "formula": "Zn",
    "bottleColor": "#c0cfe4",
    "short": {
      "en": "Metal",
      "ar": "معدن",
      "fr": "Métal"
    },
    "info": {
      "en": "More reactive than copper — displaces copper from copper sulfate solution.",
      "ar": "أكثر تفاعلاً من النحاس — يزيح النحاس من محلول كبريتات النحاس.",
      "fr": "Plus réactif que le cuivre — déplace le cuivre d'une solution de sulfate de cuivre."
    }
  },
  "water": {
    "name": {
      "en": "Water",
      "ar": "الماء",
      "fr": "Eau"
    },
    "formula": "H₂O",
    "bottleColor": "#7dd3fc",
    "short": {
      "en": "Solvent",
      "ar": "مذيب",
      "fr": "Solvant"
    },
    "info": {
      "en": "Universal solvent — participates in hydrolysis and combustion reactions.",
      "ar": "المذيب الشامل — يشارك في تفاعلات التحلل المائي والاحتراق.",
      "fr": "Solvant universel — intervient dans l'hydrolyse et les réactions de combustion."
    }
  },
  "calcium": {
    "name": {
      "en": "Calcium Metal",
      "ar": "معدن الكالسيوم",
      "fr": "Calcium métallique"
    },
    "formula": "Ca",
    "bottleColor": "#d1d5db",
    "short": {
      "en": "Alkaline metal",
      "ar": "معدن قلوي أرضي",
      "fr": "Métal alcalino-terreux"
    },
    "info": {
      "en": "Less reactive than sodium — reacts slowly with water to form calcium hydroxide and hydrogen gas.",
      "ar": "أقل تفاعلاً من الصوديوم — يتفاعل ببطء مع الماء لتكوين هيدروكسيد الكالسيوم وغاز الهيدروجين.",
      "fr": "Moins réactif que le sodium — réagit lentement avec l'eau pour former de l'hydroxyde de calcium et de l'hydrogène gazeux."
    }
  },
  "copper": {
    "name": {
      "en": "Copper Metal",
      "ar": "معدن النحاس",
      "fr": "Cuivre métallique"
    },
    "formula": "Cu",
    "bottleColor": "#ea8e4f",
    "short": {
      "en": "Transition metal",
      "ar": "معدن انتقالي",
      "fr": "Métal de transition"
    },
    "info": {
      "en": "Dissolves in dilute nitric acid, producing brown NO₂ gas. Doesn't react with dilute HCl or H₂SO₄.",
      "ar": "ينحل في حمض النيتريك المخفف، منتجًا غاز NO₂ بني. لا يتفاعل مع حمض HCl أو H₂SO₄ المخفف.",
      "fr": "Se dissout dans l'acide nitrique dilué, produisant du gaz NO₂ brun. Ne réagit pas avec HCl ou H₂SO₄ dilués."
    }
  },
  "nitric_acid": {
    "name": {
      "en": "Nitric Acid",
      "ar": "حمض النيتريك",
      "fr": "Acide nitrique"
    },
    "formula": "HNO₃",
    "bottleColor": "#fbbf24",
    "short": {
      "en": "Strong oxidizing acid",
      "ar": "حمض قوي مؤكسد",
      "fr": "Acide oxydant puissant"
    },
    "info": {
      "en": "Powerful oxidizer — reacts with most metals, producing toxic brown NO₂ gas.",
      "ar": "مؤكسد قوي — يتفاعل مع معظم المعادن، منتجًا غاز NO₂ سام بني.",
      "fr": "Oxydant puissant — réagit avec la plupart des métaux, produisant du gaz NO₂ brun toxique."
    }
  },
  "lead_nitrate": {
    "name": {
      "en": "Lead Nitrate",
      "ar": "نترات الرصاص",
      "fr": "Nitrate de plomb"
    },
    "formula": "Pb(NO₃)₂",
    "bottleColor": "#e5e7eb",
    "short": {
      "en": "Metal salt",
      "ar": "ملح معدني",
      "fr": "Sel métallique"
    },
    "info": {
      "en": "Colorless solution — forms bright yellow precipitate with iodide ions.",
      "ar": "محلول عديم اللون — يكون راسب أصفر ساطع مع أيونات اليوديد.",
      "fr": "Solution incolore — forme un précipité jaune vif avec les ions iodure."
    }
  },
  "sodium_chloride": {
    "name": {
      "en": "Sodium Chloride",
      "ar": "كلوريد الصوديوم",
      "fr": "Chlorure de sodium"
    },
    "formula": "NaCl",
    "bottleColor": "#f3f4f6",
    "short": {
      "en": "Salt",
      "ar": "ملح",
      "fr": "Sel"
    },
    "info": {
      "en": "Table salt — doesn't form colored precipitates with most metal ions.",
      "ar": "ملح الطعام — لا يكوّن رواسب ملونة مع معظم أيونات المعادن.",
      "fr": "Sel de table — ne forme pas de précipités colorés avec la plupart des ions métalliques."
    }
  },
  "starch": {
    "name": {
      "en": "Starch Solution",
      "ar": "محلول النشا",
      "fr": "Solution d'amidon"
    },
    "formula": "(C₆H₁₀O₅)ₙ",
    "bottleColor": "#fef3c7",
    "short": {
      "en": "Polymer",
      "ar": "بوليمر",
      "fr": "Polymère"
    },
    "info": {
      "en": "Turns deep blue-black with iodine due to the formation of a starch-iodine complex.",
      "ar": "يتحول إلى أزرق-أسود عميق مع اليود بسبب تكوين معقد النشا-اليود.",
      "fr": "Devient bleu-noir profond avec l'iode grâce à la formation d'un complexe amidon-iode."
    }
  },
  "iodine": {
    "name": {
      "en": "Iodine",
      "ar": "اليود",
      "fr": "Iode"
    },
    "formula": "I₂",
    "bottleColor": "#92400e",
    "short": {
      "en": "Halogen",
      "ar": "الهالوجين",
      "fr": "Halogène"
    },
    "info": {
      "en": "Forms a striking blue-black complex with starch — a classic test for starch in food.",
      "ar": "يكوّن معقد أزرق-أسود مميز مع النشا — اختبار كلاسيكي للكشف عن النشا في الغذاء.",
      "fr": "Forme un complexe bleu-noir saisissant avec l'amidon — un test classique pour détecter l'amidon dans les aliments."
    }
  },
  "glucose": {
    "name": {
      "en": "Glucose Solution",
      "ar": "محلول الجلوكوز",
      "fr": "Solution de glucose"
    },
    "formula": "C₆H₁₂O₆",
    "bottleColor": "#fcd34d",
    "short": {
      "en": "Sugar",
      "ar": "سكر",
      "fr": "Sucre"
    },
    "info": {
      "en": "A reducing sugar — doesn't turn blue-black with iodine like starch does.",
      "ar": "سكر مختزل — لا يتحول إلى أزرق-أسود مع اليود مثل النشا.",
      "fr": "Un sucre réducteur — ne devient pas bleu-noir avec l'iode comme le fait l'amidon."
    }
  },
  "manganese_dioxide": {
    "name": {
      "en": "Manganese Dioxide",
      "ar": "ثاني أكسيد المنجنيز",
      "fr": "Dioxyde de manganèse"
    },
    "formula": "MnO₂",
    "bottleColor": "#5b5b5b",
    "short": {
      "en": "Catalyst",
      "ar": "عامل حفّاز",
      "fr": "Catalyseur"
    },
    "info": {
      "en": "A powerful catalyst — speeds up H₂O₂ decomposition without being consumed.",
      "ar": "عامل حفّاز قوي — يسرّع تحلل H₂O₂ دون أن يُستهلك.",
      "fr": "Un catalyseur puissant — accélère la décomposition de H₂O₂ sans être consommé."
    }
  },
  "iron_oxide": {
    "name": {
      "en": "Iron Oxide Powder",
      "ar": "مسحوق أكسيد الحديد",
      "fr": "Oxyde de fer en poudre"
    },
    "formula": "Fe₂O₃/Fe₃O₄",
    "bottleColor": "#7c2d12",
    "short": {
      "en": "Metal oxide",
      "ar": "أكسيد معدني",
      "fr": "Oxyde métallique"
    },
    "info": {
      "en": "Forms when iron reacts with oxygen — rust is a slow, damp version of this. Unlike MnO₂, it doesn't effectively catalyze H₂O₂ decomposition.",
      "ar": "يتكوّن عند تفاعل الحديد مع الأكسجين — الصدأ هو نسخة بطيئة ورطبة من هذا التفاعل. على عكس MnO₂، لا يحفز بفعالية تحلل H₂O₂.",
      "fr": "Se forme quand le fer réagit avec l'oxygène — la rouille en est une version lente et humide. Contrairement au MnO₂, il ne catalyse pas efficacement la décomposition de H₂O₂."
    }
  },
  "sugar": {
    "name": {
      "en": "Sugar (Sucrose)",
      "ar": "السكر (السكروز)",
      "fr": "Sucre (saccharose)"
    },
    "formula": "C₁₂H₂₂O₁₁",
    "bottleColor": "#fef08a",
    "short": {
      "en": "Organic compound",
      "ar": "مركب عضوي",
      "fr": "Composé organique"
    },
    "info": {
      "en": "When dehydrated by conc. H₂SO₄, it blackens into pure carbon — a dramatic exothermic reaction.",
      "ar": "عند جفافه بـ H₂SO₄ المركز، يتحول إلى كربون نقي أسود — تفاعل طارد حرارة درامي.",
      "fr": "Déshydraté par l'acide sulfurique concentré, il noircit en carbone pur — une réaction exothermique spectaculaire."
    }
  },
  "sulfuric_acid": {
    "name": {
      "en": "Sulfuric Acid",
      "ar": "حمض الكبريتيك",
      "fr": "Acide sulfurique"
    },
    "formula": "H₂SO₄",
    "bottleColor": "#fed7aa",
    "short": {
      "en": "Strong dehydrating acid",
      "ar": "حمض قوي مجفف",
      "fr": "Acide déshydratant puissant"
    },
    "info": {
      "en": "A powerful dehydrating agent — removes water from organic compounds, leaving carbon behind.",
      "ar": "عامل جفاف قوي — يزيل الماء من المركبات العضوية، تاركًا الكربون.",
      "fr": "Un agent déshydratant puissant — retire l'eau des composés organiques, ne laissant que du carbone."
    }
  },
  "hydrochloric_acid": {
    "name": {
      "en": "Hydrochloric Acid",
      "ar": "حمض الهيدروكلوريك",
      "fr": "Acide chlorhydrique"
    },
    "formula": "HCl",
    "bottleColor": "#fca5a5",
    "short": {
      "en": "Strong acid",
      "ar": "حمض قوي",
      "fr": "Acide fort"
    },
    "info": {
      "en": "A strong acid that ionizes completely in water, formed directly from hydrogen + chlorine gas — reacts with metals, but less dramatically than concentrated HNO₃, and doesn't dehydrate sugar.",
      "ar": "حمض قوي يتأين بالكامل بالماء، ويتكوّن مباشرة من غاز الهيدروجين والكلور — يتفاعل مع المعادن لكن بعنف أقل من HNO₃ المركز، ولا يجفف السكر.",
      "fr": "Un acide fort qui s'ionise complètement dans l'eau, formé directement à partir d'hydrogène + chlore gazeux — réagit avec les métaux, mais moins violemment que le HNO₃ concentré, et ne déshydrate pas le sucre."
    }
  },
  "aluminum": {
    "name": {
      "en": "Aluminum Powder",
      "ar": "مسحوق الألومنيوم",
      "fr": "Aluminium en poudre"
    },
    "formula": "Al",
    "bottleColor": "#e5e7eb",
    "short": {
      "en": "Amphoteric metal",
      "ar": "معدن برمائي",
      "fr": "Métal amphotère"
    },
    "info": {
      "en": "Reacts with both acids AND strong bases — amphoteric. Reacts vigorously with NaOH + water.",
      "ar": "يتفاعل مع الحمضيات والقواعد القوية — برمائي. يتفاعل بعنف مع NaOH والماء.",
      "fr": "Réagit à la fois avec les acides ET les bases fortes — amphotère. Réagit vigoureusement avec NaOH + eau."
    }
  },
  "naoh": {
    "name": {
      "en": "Sodium Hydroxide",
      "ar": "هيدروكسيد الصوديوم",
      "fr": "Hydroxyde de sodium"
    },
    "formula": "NaOH",
    "bottleColor": "#a5f3fc",
    "short": {
      "en": "Strong base",
      "ar": "قاعدة قوية",
      "fr": "Base forte"
    },
    "info": {
      "en": "A strong base — neutralizes acids and reacts with amphoteric metals like aluminum, releasing hydrogen gas.",
      "ar": "قاعدة قوية — تعادل الأحماض وتتفاعل مع المعادن البرمائية مثل الألومنيوم، محررة غاز الهيدروجين.",
      "fr": "Une base forte — neutralise les acides et réagit avec les métaux amphotères comme l'aluminium, libérant de l'hydrogène gazeux."
    }
  },
  "copper_sulfate": {
    "name": {
      "en": "Copper Sulfate Solution",
      "ar": "محلول كبريتات النحاس",
      "fr": "Solution de sulfate de cuivre"
    },
    "formula": "CuSO₄",
    "bottleColor": "#2563eb",
    "short": {
      "en": "Metal salt",
      "ar": "ملح معدني",
      "fr": "Sel métallique"
    },
    "info": {
      "en": "Bright blue solution — more reactive metals such as zinc or iron displace the copper from it.",
      "ar": "محلول أزرق ساطع — المعادن الأكثر تفاعلاً مثل الزنك أو الحديد تزيح النحاس منه.",
      "fr": "Solution bleu vif — les métaux plus réactifs comme le zinc ou le fer en déplacent le cuivre."
    }
  },
  "vinegar": {
    "name": {
      "en": "Vinegar (Acetic Acid)",
      "ar": "الخل (حمض الأسيتيك)",
      "fr": "Vinaigre (acide acétique)"
    },
    "formula": "CH₃COOH",
    "bottleColor": "#f0d9a0",
    "short": {
      "en": "Weak acid",
      "ar": "حمض ضعيف",
      "fr": "Acide faible"
    },
    "info": {
      "en": "A weak acid — fizzes with baking soda to release CO₂ gas, but too mild for reactions needing a strong acid or base.",
      "ar": "حمض ضعيف — يفور مع بيكربونات الصوديوم ليطلق غاز CO₂، لكنه ضعيف جداً للتفاعلات التي تحتاج حمضاً أو قاعدة قوية.",
      "fr": "Un acide faible — pétille avec le bicarbonate de soude pour libérer du gaz CO₂, mais trop doux pour les réactions nécessitant un acide ou une base forte."
    }
  },
  "baking_soda": {
    "name": {
      "en": "Baking Soda Solution",
      "ar": "محلول بيكربونات الصوديوم",
      "fr": "Solution de bicarbonate de soude"
    },
    "formula": "NaHCO₃",
    "bottleColor": "#f1f5f9",
    "short": {
      "en": "Mild base",
      "ar": "قاعدة خفيفة",
      "fr": "Base douce"
    },
    "info": {
      "en": "A mild base — reacts with acids like vinegar to release carbon dioxide gas, causing fizzing.",
      "ar": "قاعدة خفيفة — تتفاعل مع الأحماض مثل الخل لتطلق غاز ثاني أكسيد الكربون، مسببة الفوران.",
      "fr": "Une base douce — réagit avec des acides comme le vinaigre pour libérer du dioxyde de carbone, provoquant l'effervescence."
    }
  },
  "iron": {
    "name": {
      "en": "Iron Filings",
      "ar": "برادة الحديد",
      "fr": "Limaille de fer"
    },
    "formula": "Fe",
    "bottleColor": "#52525b",
    "short": {
      "en": "Metal",
      "ar": "معدن",
      "fr": "Métal"
    },
    "info": {
      "en": "A reactive metal — displaces copper from copper sulfate solution and combines with sulfur when heated.",
      "ar": "معدن متفاعل — يزيح النحاس من محلول كبريتات النحاس ويتحد مع الكبريت عند التسخين.",
      "fr": "Un métal réactif — déplace le cuivre d'une solution de sulfate de cuivre et se combine avec le soufre sous l'effet de la chaleur."
    }
  },
  "hydrogen_peroxide": {
    "name": {
      "en": "Hydrogen Peroxide",
      "ar": "بيروكسيد الهيدروجين",
      "fr": "Peroxyde d'hydrogène"
    },
    "formula": "H₂O₂",
    "bottleColor": "#eff6ff",
    "short": {
      "en": "Oxidizer",
      "ar": "مؤكسد",
      "fr": "Oxydant"
    },
    "info": {
      "en": "Breaks down into water and oxygen gas — rapidly when a catalyst such as MnO₂ or potassium iodide is present.",
      "ar": "يتحلل إلى ماء وغاز أكسجين — بسرعة عند وجود عامل حفّاز مثل MnO₂ أو يوديد البوتاسيوم.",
      "fr": "Se décompose en eau et en oxygène gazeux — rapidement en présence d'un catalyseur comme le MnO₂ ou l'iodure de potassium."
    }
  },
  "potassium_iodide": {
    "name": {
      "en": "Potassium Iodide",
      "ar": "يوديد البوتاسيوم",
      "fr": "Iodure de potassium"
    },
    "formula": "KI",
    "bottleColor": "#fff7cd",
    "short": {
      "en": "Metal salt",
      "ar": "ملح معدني",
      "fr": "Sel métallique"
    },
    "info": {
      "en": "Colorless solution — forms a bright yellow precipitate with lead ions and rapidly catalyzes hydrogen peroxide breakdown.",
      "ar": "محلول عديم اللون — يكوّن راسباً أصفر ساطعاً مع أيونات الرصاص ويحفّز بسرعة تحلل بيروكسيد الهيدروجين.",
      "fr": "Solution incolore — forme un précipité jaune vif avec les ions plomb et catalyse rapidement la décomposition du peroxyde d'hydrogène."
    }
  },
  "dry_ice": {
    "name": {
      "en": "Dry Ice",
      "ar": "الثلج الجاف",
      "fr": "Glace carbonique"
    },
    "formula": "CO₂ (solid)",
    "bottleColor": "#f0f9ff",
    "short": {
      "en": "Solid CO₂",
      "ar": "ثاني أكسيد الكربون الصلب",
      "fr": "CO₂ solide"
    },
    "info": {
      "en": "Frozen carbon dioxide — sublimates straight into gas, and in warm water produces dense, visible white fog.",
      "ar": "ثاني أكسيد الكربون المجمد — يتسامى مباشرة إلى غاز، وفي الماء الدافئ ينتج ضباباً أبيض كثيفاً ومرئياً.",
      "fr": "Dioxyde de carbone gelé — se sublime directement en gaz, et dans l'eau chaude produit un brouillard blanc dense et visible."
    }
  },
  "warm_water": {
    "name": {
      "en": "Warm Water",
      "ar": "ماء دافئ",
      "fr": "Eau tiède"
    },
    "formula": "H₂O (warm)",
    "bottleColor": "#bae6fd",
    "short": {
      "en": "Solvent",
      "ar": "مذيب",
      "fr": "Solvant"
    },
    "info": {
      "en": "Warm water speeds up the sublimation of dry ice, producing thicker, more visible fog than cold water would.",
      "ar": "الماء الدافئ يسرّع تسامي الثلج الجاف، منتجاً ضباباً أكثف وأوضح من الماء البارد.",
      "fr": "L'eau tiède accélère la sublimation de la glace carbonique, produisant un brouillard plus épais et plus visible que l'eau froide."
    }
  },
  "luminol": {
    "name": {
      "en": "Luminol",
      "ar": "اللومينول",
      "fr": "Luminol"
    },
    "formula": "C₈H₇N₃O₂",
    "bottleColor": "#e0e7ff",
    "short": {
      "en": "Chemiluminescent compound",
      "ar": "مركب كيميائي مضيء",
      "fr": "Composé chimiluminescent"
    },
    "info": {
      "en": "Glows blue-green when oxidized by hydrogen peroxide — the same reaction forensic teams use to detect trace blood.",
      "ar": "يتوهج بلون أزرق مخضر عند أكسدته ببيروكسيد الهيدروجين — نفس التفاعل الذي تستخدمه الفرق الجنائية للكشف عن آثار الدم.",
      "fr": "Brille en bleu-vert lorsqu'il est oxydé par le peroxyde d'hydrogène — la même réaction utilisée par la police scientifique pour détecter des traces de sang."
    }
  },
  "potassium": {
    "name": {
      "en": "Potassium Metal",
      "ar": "معدن البوتاسيوم",
      "fr": "Potassium métallique"
    },
    "formula": "K",
    "bottleColor": "#94a3b8",
    "short": {
      "en": "Alkali metal",
      "ar": "معدن قلوي",
      "fr": "Métal alcalin"
    },
    "info": {
      "en": "An extremely reactive alkali metal — similar to sodium but reacts even more violently and dangerously with water.",
      "ar": "معدن قلوي شديد التفاعل — يشبه الصوديوم لكنه يتفاعل بعنف وخطورة أكبر مع الماء.",
      "fr": "Un métal alcalin extrêmement réactif — semblable au sodium mais réagit encore plus violemment et dangereusement avec l'eau."
    }
  },
  "ammonia": {
    "name": {
      "en": "Ammonia",
      "ar": "الأمونيا",
      "fr": "Ammoniac"
    },
    "formula": "NH₃",
    "bottleColor": "#ddd6fe",
    "short": {
      "en": "Made in Free Lab: N + H",
      "ar": "صُنعت في اللعب الحر: N + H",
      "fr": "Fabriqué en Labo Libre : N + H"
    },
    "info": {
      "en": "A pungent gas made of nitrogen and hydrogen — used industrially to make fertilizers.",
      "ar": "غاز نفاذ الرائحة مكوّن من النيتروجين والهيدروجين — يُستخدم صناعياً لصنع الأسمدة.",
      "fr": "Un gaz piquant composé d'azote et d'hydrogène — utilisé industriellement pour fabriquer des engrais."
    }
  },
  "carbon_dioxide": {
    "name": {
      "en": "Carbon Dioxide",
      "ar": "ثاني أكسيد الكربون",
      "fr": "Dioxyde de carbone"
    },
    "formula": "CO₂",
    "bottleColor": "#cbd5e1",
    "short": {
      "en": "Made in Free Lab: C + O",
      "ar": "صُنع في اللعب الحر: C + O",
      "fr": "Fabriqué en Labo Libre : C + O"
    },
    "info": {
      "en": "The gas you exhale and plants absorb — also what makes soda fizzy.",
      "ar": "الغاز الذي تزفره وتمتصه النباتات — وهو أيضاً ما يجعل المشروبات الغازية فوّارة.",
      "fr": "Le gaz que vous expirez et que les plantes absorbent — c'est aussi ce qui rend les sodas pétillants."
    }
  },
  "iron_sulfide": {
    "name": {
      "en": "Iron Sulfide",
      "ar": "كبريتيد الحديد",
      "fr": "Sulfure de fer"
    },
    "formula": "FeS",
    "bottleColor": "#44403c",
    "short": {
      "en": "Made in Free Lab: Fe + S",
      "ar": "صُنع في اللعب الحر: Fe + S",
      "fr": "Fabriqué en Labo Libre : Fe + S"
    },
    "info": {
      "en": "A dull black solid formed when iron and sulfur combine directly under heat.",
      "ar": "صلب أسود باهت يتكوّن عند اتحاد الحديد والكبريت مباشرة تحت الحرارة.",
      "fr": "Un solide noir terne formé lorsque le fer et le soufre se combinent directement sous la chaleur."
    }
  },
  "potassium_chloride": {
    "name": {
      "en": "Potassium Chloride",
      "ar": "كلوريد البوتاسيوم",
      "fr": "Chlorure de potassium"
    },
    "formula": "KCl",
    "bottleColor": "#f3f4f6",
    "short": {
      "en": "Made in Free Lab: K + Cl",
      "ar": "صُنع في اللعب الحر: K + Cl",
      "fr": "Fabriqué en Labo Libre : K + Cl"
    },
    "info": {
      "en": "A white salt, chemically similar to table salt — sometimes used as a low-sodium salt substitute.",
      "ar": "ملح أبيض شبيه كيميائياً بملح الطعام — يُستخدم أحياناً كبديل منخفض الصوديوم.",
      "fr": "Un sel blanc, chimiquement semblable au sel de table — parfois utilisé comme substitut de sel pauvre en sodium."
    }
  },
  "methane": {
    "name": {
      "en": "Methane",
      "ar": "الميثان",
      "fr": "Méthane"
    },
    "formula": "CH₄",
    "bottleColor": "#bfdbfe",
    "short": {
      "en": "Made in Free Lab: C + H",
      "ar": "صُنع في اللعب الحر: C + H",
      "fr": "Fabriqué en Labo Libre : C + H"
    },
    "info": {
      "en": "The simplest hydrocarbon — the main component of natural gas.",
      "ar": "أبسط مركب هيدروكربوني — المكوّن الرئيسي للغاز الطبيعي.",
      "fr": "L'hydrocarbure le plus simple — le composant principal du gaz naturel."
    }
  },
  "hydrogen_sulfide": {
    "name": {
      "en": "Hydrogen Sulfide",
      "ar": "كبريتيد الهيدروجين",
      "fr": "Sulfure d'hydrogène"
    },
    "formula": "H₂S",
    "bottleColor": "#d9f99d",
    "short": {
      "en": "Made in Free Lab: H + S",
      "ar": "صُنع في اللعب الحر: H + S",
      "fr": "Fabriqué en Labo Libre : H + S"
    },
    "info": {
      "en": "A toxic gas with the unmistakable smell of rotten eggs.",
      "ar": "غاز سام برائحة البيض الفاسد المميزة.",
      "fr": "Un gaz toxique à l'odeur caractéristique d'œufs pourris."
    }
  },
  "sodium_hydride": {
    "name": {
      "en": "Sodium Hydride",
      "ar": "هيدريد الصوديوم",
      "fr": "Hydrure de sodium"
    },
    "formula": "NaH",
    "bottleColor": "#a1a1aa",
    "short": {
      "en": "Made in Free Lab: H + Na",
      "ar": "صُنع في اللعب الحر: H + Na",
      "fr": "Fabriqué en Labo Libre : H + Na"
    },
    "info": {
      "en": "An ionic solid where hydrogen acts as a negative ion (H⁻) — reacts violently with water, releasing H₂ gas.",
      "ar": "صلب أيوني يتصرف فيه الهيدروجين كأيون سالب (H⁻) — يتفاعل بعنف مع الماء محرراً غاز H₂.",
      "fr": "Un solide ionique où l'hydrogène agit comme un ion négatif (H⁻) — réagit violemment avec l'eau, libérant du gaz H₂."
    }
  },
  "hydrogen_iodide": {
    "name": {
      "en": "Hydrogen Iodide",
      "ar": "يوديد الهيدروجين",
      "fr": "Iodure d'hydrogène"
    },
    "formula": "HI",
    "bottleColor": "#f5d0c5",
    "short": {
      "en": "Made in Free Lab: H + I",
      "ar": "صُنع في اللعب الحر: H + I",
      "fr": "Fabriqué en Labo Libre : H + I"
    },
    "info": {
      "en": "A fuming acidic gas — dissolves in water to form hydroiodic acid, one of the strongest common acids.",
      "ar": "غاز حمضي متصاعد — يذوب بالماء مكوّناً حمض الهيدرويوديك، أحد أقوى الأحماض الشائعة.",
      "fr": "Un gaz acide fumant — se dissout dans l'eau pour former l'acide iodhydrique, l'un des acides courants les plus forts."
    }
  },
  "nitrogen_dioxide": {
    "name": {
      "en": "Nitrogen Dioxide",
      "ar": "ثاني أكسيد النيتروجين",
      "fr": "Dioxyde d'azote"
    },
    "formula": "NO₂",
    "bottleColor": "#c2410c",
    "short": {
      "en": "Made in Free Lab: O + N",
      "ar": "صُنع في اللعب الحر: O + N",
      "fr": "Fabriqué en Labo Libre : O + N"
    },
    "info": {
      "en": "A reddish-brown toxic gas — a major component of smog and acid rain.",
      "ar": "غاز سام بني محمر — من المكوّنات الرئيسية للضباب الدخاني والمطر الحمضي.",
      "fr": "Un gaz toxique brun-rougeâtre — un composant majeur du smog et des pluies acides."
    }
  },
  "sodium_oxide": {
    "name": {
      "en": "Sodium Oxide",
      "ar": "أكسيد الصوديوم",
      "fr": "Oxyde de sodium"
    },
    "formula": "Na₂O",
    "bottleColor": "#fafafa",
    "short": {
      "en": "Made in Free Lab: O + Na",
      "ar": "صُنع في اللعب الحر: O + Na",
      "fr": "Fabriqué en Labo Libre : O + Na"
    },
    "info": {
      "en": "A white solid formed when sodium burns in oxygen — reacts vigorously with water to form NaOH.",
      "ar": "صلب أبيض يتكوّن عند احتراق الصوديوم بالأكسجين — يتفاعل بعنف مع الماء مكوّناً NaOH.",
      "fr": "Un solide blanc formé quand le sodium brûle dans l'oxygène — réagit vigoureusement avec l'eau pour former du NaOH."
    }
  },
  "sulfur_dioxide": {
    "name": {
      "en": "Sulfur Dioxide",
      "ar": "ثاني أكسيد الكبريت",
      "fr": "Dioxyde de soufre"
    },
    "formula": "SO₂",
    "bottleColor": "#fef9c3",
    "short": {
      "en": "Made in Free Lab: O + S",
      "ar": "صُنع في اللعب الحر: O + S",
      "fr": "Fabriqué en Labo Libre : O + S"
    },
    "info": {
      "en": "A pungent gas released when sulfur burns — used to preserve dried fruit and a major cause of acid rain.",
      "ar": "غاز نفاذ يتصاعد عند احتراق الكبريت — يُستخدم لحفظ الفواكه المجففة وهو سبب رئيسي للمطر الحمضي.",
      "fr": "Un gaz piquant libéré quand le soufre brûle — utilisé pour conserver les fruits séchés et cause majeure des pluies acides."
    }
  },
  "zinc_oxide": {
    "name": {
      "en": "Zinc Oxide",
      "ar": "أكسيد الزنك",
      "fr": "Oxyde de zinc"
    },
    "formula": "ZnO",
    "bottleColor": "#f5f5f4",
    "short": {
      "en": "Made in Free Lab: O + Zn",
      "ar": "صُنع في اللعب الحر: O + Zn",
      "fr": "Fabriqué en Labo Libre : O + Zn"
    },
    "info": {
      "en": "A white powder — the active ingredient in mineral sunscreen and diaper rash cream.",
      "ar": "مسحوق أبيض — المكوّن الفعّال في واقي الشمس المعدني وكريمات التسلخ.",
      "fr": "Une poudre blanche — l'ingrédient actif des crèmes solaires minérales et des crèmes contre l'érythème fessier."
    }
  },
  "calcium_oxide": {
    "name": {
      "en": "Calcium Oxide (Quicklime)",
      "ar": "أكسيد الكالسيوم (الكلس الحي)",
      "fr": "Oxyde de calcium (chaux vive)"
    },
    "formula": "CaO",
    "bottleColor": "#e7e5e4",
    "short": {
      "en": "Made in Free Lab: O + Ca",
      "ar": "صُنع في اللعب الحر: O + Ca",
      "fr": "Fabriqué en Labo Libre : O + Ca"
    },
    "info": {
      "en": "Made by burning calcium — reacts strongly with water, releasing heat, to form slaked lime.",
      "ar": "يُصنع بحرق الكالسيوم — يتفاعل بقوة مع الماء محرراً حرارة ليكوّن الجير المطفأ.",
      "fr": "Obtenu en brûlant du calcium — réagit fortement avec l'eau, en dégageant de la chaleur, pour former de la chaux éteinte."
    }
  },
  "copper_oxide": {
    "name": {
      "en": "Copper Oxide",
      "ar": "أكسيد النحاس",
      "fr": "Oxyde de cuivre"
    },
    "formula": "CuO",
    "bottleColor": "#1c1917",
    "short": {
      "en": "Made in Free Lab: O + Cu",
      "ar": "صُنع في اللعب الحر: O + Cu",
      "fr": "Fabriqué en Labo Libre : O + Cu"
    },
    "info": {
      "en": "A black powder that forms on copper's surface when heated in air.",
      "ar": "مسحوق أسود يتكوّن على سطح النحاس عند تسخينه بالهواء.",
      "fr": "Une poudre noire qui se forme à la surface du cuivre chauffé à l'air."
    }
  },
  "aluminum_oxide": {
    "name": {
      "en": "Aluminum Oxide",
      "ar": "أكسيد الألومنيوم",
      "fr": "Oxyde d'aluminium"
    },
    "formula": "Al₂O₃",
    "bottleColor": "#fff1f2",
    "short": {
      "en": "Made in Free Lab: O + Al",
      "ar": "صُنع في اللعب الحر: O + Al",
      "fr": "Fabriqué en Labo Libre : O + Al"
    },
    "info": {
      "en": "An extremely hard white powder — the natural form is corundum, the mineral behind rubies and sapphires.",
      "ar": "مسحوق أبيض شديد الصلابة — شكله الطبيعي هو الكوراندوم، المعدن الأساسي للياقوت بأنواعه.",
      "fr": "Une poudre blanche extrêmement dure — sa forme naturelle est le corindon, le minéral à l'origine des rubis et des saphirs."
    }
  },
  "sodium_iodide": {
    "name": {
      "en": "Sodium Iodide",
      "ar": "يوديد الصوديوم",
      "fr": "Iodure de sodium"
    },
    "formula": "NaI",
    "bottleColor": "#fef2f2",
    "short": {
      "en": "Made in Free Lab: Na + I",
      "ar": "صُنع في اللعب الحر: Na + I",
      "fr": "Fabriqué en Labo Libre : Na + I"
    },
    "info": {
      "en": "A white salt, similar to table salt — added to table salt in some countries to prevent iodine deficiency.",
      "ar": "ملح أبيض شبيه بملح الطعام — يُضاف لملح الطعام ببعض الدول للوقاية من نقص اليود.",
      "fr": "Un sel blanc, semblable au sel de table — ajouté au sel de table dans certains pays pour prévenir la carence en iode."
    }
  },
  "zinc_chloride": {
    "name": {
      "en": "Zinc Chloride",
      "ar": "كلوريد الزنك",
      "fr": "Chlorure de zinc"
    },
    "formula": "ZnCl₂",
    "bottleColor": "#f0fdf4",
    "short": {
      "en": "Made in Free Lab: Cl + Zn",
      "ar": "صُنع في اللعب الحر: Cl + Zn",
      "fr": "Fabriqué en Labo Libre : Cl + Zn"
    },
    "info": {
      "en": "A white solid that readily absorbs moisture from the air — used in soldering flux.",
      "ar": "صلب أبيض يمتص الرطوبة من الهواء بسهولة — يُستخدم في مادة اللحام المساعدة.",
      "fr": "Un solide blanc qui absorbe facilement l'humidité de l'air — utilisé dans le flux de soudure."
    }
  },
  "calcium_chloride": {
    "name": {
      "en": "Calcium Chloride",
      "ar": "كلوريد الكالسيوم",
      "fr": "Chlorure de calcium"
    },
    "formula": "CaCl₂",
    "bottleColor": "#ecfeff",
    "short": {
      "en": "Made in Free Lab: Cl + Ca",
      "ar": "صُنع في اللعب الحر: Cl + Ca",
      "fr": "Fabriqué en Labo Libre : Cl + Ca"
    },
    "info": {
      "en": "A white salt used to de-ice roads in winter and as a food preservative.",
      "ar": "ملح أبيض يُستخدم لإذابة الثلج عن الطرق شتاءً وكمادة حافظة للأغذية.",
      "fr": "Un sel blanc utilisé pour déglacer les routes en hiver et comme conservateur alimentaire."
    }
  },
  "copper_chloride": {
    "name": {
      "en": "Copper Chloride",
      "ar": "كلوريد النحاس",
      "fr": "Chlorure de cuivre"
    },
    "formula": "CuCl₂",
    "bottleColor": "#06b6d4",
    "short": {
      "en": "Made in Free Lab: Cl + Cu",
      "ar": "صُنع في اللعب الحر: Cl + Cu",
      "fr": "Fabriqué en Labo Libre : Cl + Cu"
    },
    "info": {
      "en": "Forms distinctive blue-green crystals — used to add a green-blue color to fireworks and flames.",
      "ar": "يكوّن بلورات مميزة بلون أزرق مخضر — يُستخدم لإضافة لون أزرق مخضر للألعاب النارية واللهب.",
      "fr": "Forme des cristaux bleu-vert distinctifs — utilisé pour donner une couleur bleu-vert aux feux d'artifice et aux flammes."
    }
  },
  "aluminum_chloride": {
    "name": {
      "en": "Aluminum Chloride",
      "ar": "كلوريد الألومنيوم",
      "fr": "Chlorure d'aluminium"
    },
    "formula": "AlCl₃",
    "bottleColor": "#fde68a",
    "short": {
      "en": "Made in Free Lab: Cl + Al",
      "ar": "صُنع في اللعب الحر: Cl + Al",
      "fr": "Fabriqué en Labo Libre : Cl + Al"
    },
    "info": {
      "en": "A pale yellow solid formed in a vigorous reaction — widely used as a catalyst in the chemical industry.",
      "ar": "صلب أصفر باهت يتكوّن بتفاعل عنيف — يُستخدم على نطاق واسع كعامل حفّاز بالصناعة الكيميائية.",
      "fr": "Un solide jaune pâle formé lors d'une réaction vigoureuse — largement utilisé comme catalyseur dans l'industrie chimique."
    }
  },
  "iron_chloride": {
    "name": {
      "en": "Iron(III) Chloride",
      "ar": "كلوريد الحديد الثلاثي",
      "fr": "Chlorure de fer (III)"
    },
    "formula": "FeCl₃",
    "bottleColor": "#78350f",
    "short": {
      "en": "Made in Free Lab: Cl + Fe",
      "ar": "صُنع في اللعب الحر: Cl + Fe",
      "fr": "Fabriqué en Labo Libre : Cl + Fe"
    },
    "info": {
      "en": "Iron burns in chlorine gas with a fiery glow to form this dark solid — widely used to etch copper circuit boards.",
      "ar": "يحترق الحديد بغاز الكلور بتوهج ناري مكوّناً هذا الصلب الداكن — يُستخدم على نطاق واسع لحفر دوائر النحاس الإلكترونية.",
      "fr": "Le fer brûle dans le gaz chloré avec un éclat ardent pour former ce solide foncé — largement utilisé pour graver les circuits imprimés en cuivre."
    }
  },
  "zinc_sulfide": {
    "name": {
      "en": "Zinc Sulfide",
      "ar": "كبريتيد الزنك",
      "fr": "Sulfure de zinc"
    },
    "formula": "ZnS",
    "bottleColor": "#fefce8",
    "short": {
      "en": "Made in Free Lab: S + Zn",
      "ar": "صُنع في اللعب الحر: S + Zn",
      "fr": "Fabriqué en Labo Libre : S + Zn"
    },
    "info": {
      "en": "A pale solid that glows in the dark after exposure to light — used in glow-in-the-dark materials.",
      "ar": "صلب باهت يتوهج بالظلام بعد التعرض للضوء — يُستخدم في المواد المتوهجة بالظلام.",
      "fr": "Un solide pâle qui brille dans le noir après exposition à la lumière — utilisé dans les matériaux phosphorescents."
    }
  }
};

  // === FREE MODE ELEMENT REACTIONS ===
  // Every pure element this lab models (no compounds) — the full Free Lab
  // shelf. Keeping this as one list makes it easy to add more elements later.
  // All 16 guided experiments, in the same order they appear in the
  // Experiments grid — used so Solo mode's "Next Experiment" button can
  // advance sequentially, the same way Class mode advances through the
  // teacher's selected list.
  const ALL_EXPERIMENT_IDS = [
    'neutralization', 'vinegar-soda', 'copper-sulfate', 'starch-iodine',
    'zinc-copper-displacement', 'elephant-toothpaste', 'dry-ice-fog', 'iron-sulfur',
    'calcium-water', 'lead-iodide', 'manganese-h2o2', 'glowing-luminol',
    'sodium-water', 'copper-nitric-acid', 'sugar-h2so4', 'aluminum-naoh',
  ];

  const RAW_ELEMENTS = [
    'hydrogen', 'oxygen', 'carbon', 'nitrogen', 'sodium', 'chlorine',
    'sulfur', 'zinc', 'calcium', 'copper', 'aluminum', 'iron', 'potassium', 'iodine',
  ];

  const FREE_REACTIONS = [
  {
    "name": {
      "en": "Water Formation",
      "ar": "تكوين الماء",
      "fr": "Formation d'eau"
    },
    "needed": [
      "hydrogen",
      "oxygen"
    ],
    "result": {
      "color": "color-cyan",
      "text": {
        "en": "✨ H + O → H₂O (Water) — added to your shelf!",
        "ar": "✨ H + O → H₂O (ماء) — أُضيف إلى رفّك!",
        "fr": "✨ H + O → H₂O (Eau) — ajouté à ton étagère !"
      }
    },
    "heat": false,
    "precipitate": false,
    "bubbles": true,
    "produces": "water"
  },
  {
    "name": {
      "en": "Ammonia",
      "ar": "الأمونيا",
      "fr": "Ammoniac"
    },
    "needed": [
      "nitrogen",
      "hydrogen"
    ],
    "result": {
      "color": "color-purple",
      "text": {
        "en": "💜 N + H → NH₃ (Ammonia) — added to your shelf!",
        "ar": "💜 N + H → NH₃ (أمونيا) — أُضيف إلى رفّك!",
        "fr": "💜 N + H → NH₃ (Ammoniac) — ajouté à ton étagère !"
      }
    },
    "heat": false,
    "precipitate": false,
    "bubbles": true,
    "produces": "ammonia"
  },
  {
    "name": {
      "en": "Sodium Chloride (Salt)",
      "ar": "كلوريد الصوديوم (ملح)",
      "fr": "Chlorure de sodium (Sel)"
    },
    "needed": [
      "sodium",
      "chlorine"
    ],
    "result": {
      "color": "color-yellow",
      "text": {
        "en": "⚪ Na + Cl → NaCl (Table Salt) — added to your shelf!",
        "ar": "⚪ Na + Cl → NaCl (ملح الطعام) — أُضيف إلى رفّك!",
        "fr": "⚪ Na + Cl → NaCl (Sel de table) — ajouté à ton étagère !"
      }
    },
    "heat": true,
    "precipitate": true,
    "bubbles": false,
    "produces": "sodium_chloride"
  },
  {
    "name": {
      "en": "Carbon Dioxide",
      "ar": "ثاني أكسيد الكربون",
      "fr": "Dioxyde de carbone"
    },
    "needed": [
      "carbon",
      "oxygen"
    ],
    "result": {
      "color": "color-gray",
      "text": {
        "en": "⚫ C + O → CO₂ (Carbon Dioxide) — added to your shelf!",
        "ar": "⚫ C + O → CO₂ (ثاني أكسيد الكربون) — أُضيف إلى رفّك!",
        "fr": "⚫ C + O → CO₂ (Dioxyde de carbone) — ajouté à ton étagère !"
      }
    },
    "heat": false,
    "precipitate": false,
    "bubbles": true,
    "produces": "carbon_dioxide"
  },
  {
    "name": {
      "en": "Iron Sulfide",
      "ar": "كبريتيد الحديد",
      "fr": "Sulfure de fer"
    },
    "needed": [
      "iron",
      "sulfur"
    ],
    "result": {
      "color": "color-colorless",
      "text": {
        "en": "⚫ Fe + S → FeS (Iron Sulfide) — added to your shelf!",
        "ar": "⚫ Fe + S → FeS (كبريتيد الحديد) — أُضيف إلى رفّك!",
        "fr": "⚫ Fe + S → FeS (Sulfure de fer) — ajouté à ton étagère !"
      }
    },
    "heat": true,
    "precipitate": false,
    "bubbles": false,
    "produces": "iron_sulfide"
  },
  {
    "name": {
      "en": "Potassium Chloride",
      "ar": "كلوريد البوتاسيوم",
      "fr": "Chlorure de potassium"
    },
    "needed": [
      "potassium",
      "chlorine"
    ],
    "result": {
      "color": "color-yellow",
      "text": {
        "en": "⚪ K + Cl → KCl (Potassium Chloride) — added to your shelf!",
        "ar": "⚪ K + Cl → KCl (كلوريد البوتاسيوم) — أُضيف إلى رفّك!",
        "fr": "⚪ K + Cl → KCl (Chlorure de potassium) — ajouté à ton étagère !"
      }
    },
    "heat": true,
    "precipitate": true,
    "bubbles": false,
    "produces": "potassium_chloride"
  },
  {
    "name": {
      "en": "Methane",
      "ar": "الميثان",
      "fr": "Méthane"
    },
    "needed": [
      "carbon",
      "hydrogen"
    ],
    "result": {
      "color": "color-cyan",
      "text": {
        "en": "🔵 C + H → CH₄ (Methane) — added to your shelf!",
        "ar": "🔵 C + H → CH₄ (ميثان) — أُضيف إلى رفّك!",
        "fr": "🔵 C + H → CH₄ (Méthane) — ajouté à ton étagère !"
      }
    },
    "heat": false,
    "precipitate": false,
    "bubbles": true,
    "produces": "methane"
  },
  {
    "name": {
      "en": "Hydrogen Chloride",
      "ar": "كلوريد الهيدروجين",
      "fr": "Chlorure d'hydrogène"
    },
    "needed": [
      "hydrogen",
      "chlorine"
    ],
    "result": {
      "color": "color-pink",
      "text": {
        "en": "💨 H + Cl → HCl (Hydrogen Chloride) — added to your shelf!",
        "ar": "💨 H + Cl → HCl (كلوريد الهيدروجين) — أُضيف إلى رفّك!",
        "fr": "💨 H + Cl → HCl (Chlorure d'hydrogène) — ajouté à ton étagère !"
      }
    },
    "heat": true,
    "precipitate": false,
    "bubbles": false,
    "produces": "hydrochloric_acid"
  },
  {
    "name": {
      "en": "Hydrogen Sulfide",
      "ar": "كبريتيد الهيدروجين",
      "fr": "Sulfure d'hydrogène"
    },
    "needed": [
      "hydrogen",
      "sulfur"
    ],
    "result": {
      "color": "color-green",
      "text": {
        "en": "🟡 H + S → H₂S (Hydrogen Sulfide) — added to your shelf!",
        "ar": "🟡 H + S → H₂S (كبريتيد الهيدروجين) — أُضيف إلى رفّك!",
        "fr": "🟡 H + S → H₂S (Sulfure d'hydrogène) — ajouté à ton étagère !"
      }
    },
    "heat": false,
    "precipitate": false,
    "bubbles": true,
    "produces": "hydrogen_sulfide"
  },
  {
    "name": {
      "en": "Sodium Hydride",
      "ar": "هيدريد الصوديوم",
      "fr": "Hydrure de sodium"
    },
    "needed": [
      "hydrogen",
      "sodium"
    ],
    "result": {
      "color": "color-gray",
      "text": {
        "en": "⚪ H + Na → NaH (Sodium Hydride) — added to your shelf!",
        "ar": "⚪ H + Na → NaH (هيدريد الصوديوم) — أُضيف إلى رفّك!",
        "fr": "⚪ H + Na → NaH (Hydrure de sodium) — ajouté à ton étagère !"
      }
    },
    "heat": true,
    "precipitate": true,
    "bubbles": false,
    "produces": "sodium_hydride"
  },
  {
    "name": {
      "en": "Hydrogen Iodide",
      "ar": "يوديد الهيدروجين",
      "fr": "Iodure d'hydrogène"
    },
    "needed": [
      "hydrogen",
      "iodine"
    ],
    "result": {
      "color": "color-pink",
      "text": {
        "en": "💨 H + I → HI (Hydrogen Iodide) — added to your shelf!",
        "ar": "💨 H + I → HI (يوديد الهيدروجين) — أُضيف إلى رفّك!",
        "fr": "💨 H + I → HI (Iodure d'hydrogène) — ajouté à ton étagère !"
      }
    },
    "heat": false,
    "precipitate": false,
    "bubbles": false,
    "produces": "hydrogen_iodide"
  },
  {
    "name": {
      "en": "Nitrogen Dioxide",
      "ar": "ثاني أكسيد النيتروجين",
      "fr": "Dioxyde d'azote"
    },
    "needed": [
      "oxygen",
      "nitrogen"
    ],
    "result": {
      "color": "color-copper",
      "text": {
        "en": "🟤 O + N → NO₂ (Nitrogen Dioxide) — added to your shelf!",
        "ar": "🟤 O + N → NO₂ (ثاني أكسيد النيتروجين) — أُضيف إلى رفّك!",
        "fr": "🟤 O + N → NO₂ (Dioxyde d'azote) — ajouté à ton étagère !"
      }
    },
    "heat": false,
    "precipitate": false,
    "bubbles": true,
    "produces": "nitrogen_dioxide"
  },
  {
    "name": {
      "en": "Sodium Oxide",
      "ar": "أكسيد الصوديوم",
      "fr": "Oxyde de sodium"
    },
    "needed": [
      "oxygen",
      "sodium"
    ],
    "result": {
      "color": "color-colorless",
      "text": {
        "en": "⚪ O + Na → Na₂O (Sodium Oxide) — added to your shelf!",
        "ar": "⚪ O + Na → Na₂O (أكسيد الصوديوم) — أُضيف إلى رفّك!",
        "fr": "⚪ O + Na → Na₂O (Oxyde de sodium) — ajouté à ton étagère !"
      }
    },
    "heat": true,
    "precipitate": true,
    "bubbles": false,
    "produces": "sodium_oxide"
  },
  {
    "name": {
      "en": "Sulfur Dioxide",
      "ar": "ثاني أكسيد الكبريت",
      "fr": "Dioxyde de soufre"
    },
    "needed": [
      "oxygen",
      "sulfur"
    ],
    "result": {
      "color": "color-yellow",
      "text": {
        "en": "🟡 O + S → SO₂ (Sulfur Dioxide) — added to your shelf!",
        "ar": "🟡 O + S → SO₂ (ثاني أكسيد الكبريت) — أُضيف إلى رفّك!",
        "fr": "🟡 O + S → SO₂ (Dioxyde de soufre) — ajouté à ton étagère !"
      }
    },
    "heat": true,
    "precipitate": false,
    "bubbles": true,
    "produces": "sulfur_dioxide"
  },
  {
    "name": {
      "en": "Zinc Oxide",
      "ar": "أكسيد الزنك",
      "fr": "Oxyde de zinc"
    },
    "needed": [
      "oxygen",
      "zinc"
    ],
    "result": {
      "color": "color-colorless",
      "text": {
        "en": "⚪ O + Zn → ZnO (Zinc Oxide) — added to your shelf!",
        "ar": "⚪ O + Zn → ZnO (أكسيد الزنك) — أُضيف إلى رفّك!",
        "fr": "⚪ O + Zn → ZnO (Oxyde de zinc) — ajouté à ton étagère !"
      }
    },
    "heat": true,
    "precipitate": true,
    "bubbles": false,
    "produces": "zinc_oxide"
  },
  {
    "name": {
      "en": "Calcium Oxide",
      "ar": "أكسيد الكالسيوم",
      "fr": "Oxyde de calcium"
    },
    "needed": [
      "oxygen",
      "calcium"
    ],
    "result": {
      "color": "color-colorless",
      "text": {
        "en": "⚪ O + Ca → CaO (Quicklime) — added to your shelf!",
        "ar": "⚪ O + Ca → CaO (الكلس الحي) — أُضيف إلى رفّك!",
        "fr": "⚪ O + Ca → CaO (Chaux vive) — ajouté à ton étagère !"
      }
    },
    "heat": true,
    "precipitate": true,
    "bubbles": false,
    "produces": "calcium_oxide"
  },
  {
    "name": {
      "en": "Copper Oxide",
      "ar": "أكسيد النحاس",
      "fr": "Oxyde de cuivre"
    },
    "needed": [
      "oxygen",
      "copper"
    ],
    "result": {
      "color": "color-gray",
      "text": {
        "en": "⚫ O + Cu → CuO (Copper Oxide) — added to your shelf!",
        "ar": "⚫ O + Cu → CuO (أكسيد النحاس) — أُضيف إلى رفّك!",
        "fr": "⚫ O + Cu → CuO (Oxyde de cuivre) — ajouté à ton étagère !"
      }
    },
    "heat": true,
    "precipitate": true,
    "bubbles": false,
    "produces": "copper_oxide"
  },
  {
    "name": {
      "en": "Aluminum Oxide",
      "ar": "أكسيد الألومنيوم",
      "fr": "Oxyde d'aluminium"
    },
    "needed": [
      "oxygen",
      "aluminum"
    ],
    "result": {
      "color": "color-colorless",
      "text": {
        "en": "✨ O + Al → Al₂O₃ (Aluminum Oxide) — added to your shelf!",
        "ar": "✨ O + Al → Al₂O₃ (أكسيد الألومنيوم) — أُضيف إلى رفّك!",
        "fr": "✨ O + Al → Al₂O₃ (Oxyde d'aluminium) — ajouté à ton étagère !"
      }
    },
    "heat": true,
    "precipitate": true,
    "bubbles": false,
    "produces": "aluminum_oxide"
  },
  {
    "name": {
      "en": "Iron Oxide (Rust)",
      "ar": "أكسيد الحديد (الصدأ)",
      "fr": "Oxyde de fer (Rouille)"
    },
    "needed": [
      "oxygen",
      "iron"
    ],
    "result": {
      "color": "color-copper",
      "text": {
        "en": "🟤 O + Fe → Fe₂O₃ (Iron Oxide) — added to your shelf!",
        "ar": "🟤 O + Fe → Fe₂O₃ (أكسيد الحديد) — أُضيف إلى رفّك!",
        "fr": "🟤 O + Fe → Fe₂O₃ (Oxyde de fer) — ajouté à ton étagère !"
      }
    },
    "heat": true,
    "precipitate": true,
    "bubbles": false,
    "produces": "iron_oxide"
  },
  {
    "name": {
      "en": "Sodium Iodide",
      "ar": "يوديد الصوديوم",
      "fr": "Iodure de sodium"
    },
    "needed": [
      "sodium",
      "iodine"
    ],
    "result": {
      "color": "color-colorless",
      "text": {
        "en": "⚪ Na + I → NaI (Sodium Iodide) — added to your shelf!",
        "ar": "⚪ Na + I → NaI (يوديد الصوديوم) — أُضيف إلى رفّك!",
        "fr": "⚪ Na + I → NaI (Iodure de sodium) — ajouté à ton étagère !"
      }
    },
    "heat": true,
    "precipitate": true,
    "bubbles": false,
    "produces": "sodium_iodide"
  },
  {
    "name": {
      "en": "Zinc Chloride",
      "ar": "كلوريد الزنك",
      "fr": "Chlorure de zinc"
    },
    "needed": [
      "chlorine",
      "zinc"
    ],
    "result": {
      "color": "color-colorless",
      "text": {
        "en": "⚪ Cl + Zn → ZnCl₂ (Zinc Chloride) — added to your shelf!",
        "ar": "⚪ Cl + Zn → ZnCl₂ (كلوريد الزنك) — أُضيف إلى رفّك!",
        "fr": "⚪ Cl + Zn → ZnCl₂ (Chlorure de zinc) — ajouté à ton étagère !"
      }
    },
    "heat": true,
    "precipitate": true,
    "bubbles": false,
    "produces": "zinc_chloride"
  },
  {
    "name": {
      "en": "Calcium Chloride",
      "ar": "كلوريد الكالسيوم",
      "fr": "Chlorure de calcium"
    },
    "needed": [
      "chlorine",
      "calcium"
    ],
    "result": {
      "color": "color-colorless",
      "text": {
        "en": "⚪ Cl + Ca → CaCl₂ (Calcium Chloride) — added to your shelf!",
        "ar": "⚪ Cl + Ca → CaCl₂ (كلوريد الكالسيوم) — أُضيف إلى رفّك!",
        "fr": "⚪ Cl + Ca → CaCl₂ (Chlorure de calcium) — ajouté à ton étagère !"
      }
    },
    "heat": true,
    "precipitate": true,
    "bubbles": false,
    "produces": "calcium_chloride"
  },
  {
    "name": {
      "en": "Copper Chloride",
      "ar": "كلوريد النحاس",
      "fr": "Chlorure de cuivre"
    },
    "needed": [
      "chlorine",
      "copper"
    ],
    "result": {
      "color": "color-green",
      "text": {
        "en": "🟢 Cl + Cu → CuCl₂ (Copper Chloride) — added to your shelf!",
        "ar": "🟢 Cl + Cu → CuCl₂ (كلوريد النحاس) — أُضيف إلى رفّك!",
        "fr": "🟢 Cl + Cu → CuCl₂ (Chlorure de cuivre) — ajouté à ton étagère !"
      }
    },
    "heat": true,
    "precipitate": true,
    "bubbles": false,
    "produces": "copper_chloride"
  },
  {
    "name": {
      "en": "Aluminum Chloride",
      "ar": "كلوريد الألومنيوم",
      "fr": "Chlorure d'aluminium"
    },
    "needed": [
      "chlorine",
      "aluminum"
    ],
    "result": {
      "color": "color-yellow",
      "text": {
        "en": "🟡 Cl + Al → AlCl₃ (Aluminum Chloride) — added to your shelf!",
        "ar": "🟡 Cl + Al → AlCl₃ (كلوريد الألومنيوم) — أُضيف إلى رفّك!",
        "fr": "🟡 Cl + Al → AlCl₃ (Chlorure d'aluminium) — ajouté à ton étagère !"
      }
    },
    "heat": true,
    "precipitate": true,
    "bubbles": false,
    "produces": "aluminum_chloride"
  },
  {
    "name": {
      "en": "Iron(III) Chloride",
      "ar": "كلوريد الحديد الثلاثي",
      "fr": "Chlorure de fer (III)"
    },
    "needed": [
      "chlorine",
      "iron"
    ],
    "result": {
      "color": "color-copper",
      "text": {
        "en": "🟤 Cl + Fe → FeCl₃ (Iron Chloride) — added to your shelf!",
        "ar": "🟤 Cl + Fe → FeCl₃ (كلوريد الحديد) — أُضيف إلى رفّك!",
        "fr": "🟤 Cl + Fe → FeCl₃ (Chlorure de fer) — ajouté à ton étagère !"
      }
    },
    "heat": true,
    "precipitate": true,
    "bubbles": false,
    "produces": "iron_chloride"
  },
  {
    "name": {
      "en": "Zinc Sulfide",
      "ar": "كبريتيد الزنك",
      "fr": "Sulfure de zinc"
    },
    "needed": [
      "sulfur",
      "zinc"
    ],
    "result": {
      "color": "color-colorless",
      "text": {
        "en": "⚪ S + Zn → ZnS (Zinc Sulfide) — added to your shelf!",
        "ar": "⚪ S + Zn → ZnS (كبريتيد الزنك) — أُضيف إلى رفّك!",
        "fr": "⚪ S + Zn → ZnS (Sulfure de zinc) — ajouté à ton étagère !"
      }
    },
    "heat": true,
    "precipitate": true,
    "bubbles": false,
    "produces": "zinc_sulfide"
  }
];

  const EXPERIMENTS = {
  "neutralization": {
    "id": "neutralization",
    "difficulty": "easy",
    "name": {
      "en": "Acid + Base Neutralization",
      "ar": "تعادل حمض وقاعدة",
      "fr": "Neutralisation acide-base"
    },
    "chemicals": [
      "hydrochloric_acid",
      "naoh"
    ],
    "distractor": "copper_sulfate",
    "apparatusNeeded": [
      "beaker",
      "burner"
    ],
    "effects": {
      "color": "color-pink",
      "heat": true,
      "bubbles": false,
      "precipitate": false
    },
    "successMsg": {
      "en": "Neutralization complete — the indicator turned pink!",
      "ar": "اكتمل التعادل — تحوّل الكاشف إلى اللون الوردي!",
      "fr": "Neutralisation terminée — l'indicateur est devenu rose !"
    },
    "explanation": {
      "en": "HCl and NaOH react to form water and table salt (NaCl). This is exothermic, which is why you saw a temperature warning.",
      "ar": "يتفاعل حمض الهيدروكلوريك مع هيدروكسيد الصوديوم لتكوين الماء وملح الطعام. التفاعل طارد للحرارة، ولهذا ظهر تحذير الحرارة.",
      "fr": "HCl et NaOH réagissent pour former de l'eau et du sel de table (NaCl). C'est exothermique, d'où l'avertissement de température."
    },
    "hint": {
      "en": "You need an acid and a base. Try the two clear bottles — not the blue one.",
      "ar": "تحتاج إلى حمض وقاعدة. جرّب الزجاجتين الشفافتين، وليس الزرقاء.",
      "fr": "Il te faut un acide et une base. Essaie les deux flacons transparents — pas le bleu."
    },
    "wrongMsg": {
      "en": "Copper sulfate doesn't neutralize an acid or base — nothing happens.",
      "ar": "كبريتات النحاس لا تُعادل حمضًا أو قاعدة — لا يحدث شيء.",
      "fr": "Le sulfate de cuivre ne neutralise ni un acide ni une base — rien ne se passe."
    }
  },
  "vinegar-soda": {
    "id": "vinegar-soda",
    "difficulty": "easy",
    "name": {
      "en": "Vinegar + Baking Soda",
      "ar": "الخل وبيكربونات الصوديوم",
      "fr": "Vinaigre + Bicarbonate de soude"
    },
    "chemicals": [
      "vinegar",
      "baking_soda"
    ],
    "distractor": "naoh",
    "apparatusNeeded": [
      "flask"
    ],
    "effects": {
      "color": "color-clear",
      "heat": false,
      "bubbles": true,
      "precipitate": false
    },
    "successMsg": {
      "en": "It's fizzing! Carbon dioxide gas is being released.",
      "ar": "إنه يفور! يتم إطلاق غاز ثاني أكسيد الكربون.",
      "fr": "Ça pétille ! Du dioxyde de carbone est libéré."
    },
    "explanation": {
      "en": "Acetic acid (vinegar) reacts with sodium bicarbonate to release CO₂ gas — those are the bubbles rising to the surface.",
      "ar": "يتفاعل حمض الأسيتيك (الخل) مع بيكربونات الصوديوم لإطلاق غاز ثاني أكسيد الكربون — وهذه هي الفقاعات الصاعدة.",
      "fr": "L'acide acétique (vinaigre) réagit avec le bicarbonate de sodium pour libérer du gaz CO₂ — ce sont les bulles qui remontent à la surface."
    },
    "hint": {
      "en": "Grab the vinegar and the baking soda solution — skip the sodium hydroxide.",
      "ar": "استخدم الخل ومحلول بيكربونات الصوديوم، وتجاهل هيدروكسيد الصوديوم.",
      "fr": "Prends le vinaigre et la solution de bicarbonate de soude — évite l'hydroxyde de sodium."
    },
    "wrongMsg": {
      "en": "Sodium hydroxide with vinegar just neutralizes quietly — no fizz here.",
      "ar": "هيدروكسيد الصوديوم مع الخل يُعادل بهدوء فقط — لا يوجد فوران هنا.",
      "fr": "L'hydroxyde de sodium avec le vinaigre ne fait que neutraliser calmement — pas de pétillement ici."
    }
  },
  "copper-sulfate": {
    "id": "copper-sulfate",
    "difficulty": "medium",
    "name": {
      "en": "Copper Sulfate Reaction",
      "ar": "تفاعل كبريتات النحاس",
      "fr": "Réaction du sulfate de cuivre"
    },
    "chemicals": [
      "copper_sulfate",
      "iron"
    ],
    "distractor": "vinegar",
    "apparatusNeeded": [
      "testTube"
    ],
    "effects": {
      "color": "color-green",
      "heat": false,
      "bubbles": false,
      "precipitate": true
    },
    "successMsg": {
      "en": "A reddish-brown precipitate is forming as the blue color fades.",
      "ar": "يتكوّن راسب بنّي محمر بينما يتلاشى اللون الأزرق.",
      "fr": "Un précipité brun-rougeâtre se forme pendant que la couleur bleue s'estompe."
    },
    "explanation": {
      "en": "Iron displaces copper from the solution (a single displacement reaction), depositing solid copper and leaving pale iron sulfate behind.",
      "ar": "يزيح الحديد النحاس من المحلول (تفاعل إحلال أحادي)، مترسبًا نحاسًا صلبًا ومكوّنًا كبريتات حديد باهتة اللون.",
      "fr": "Le fer déplace le cuivre de la solution (une réaction de déplacement simple), déposant du cuivre solide et laissant du sulfate de fer pâle."
    },
    "hint": {
      "en": "Iron filings dropped into the blue solution will do the trick.",
      "ar": "إسقاط برادة الحديد في المحلول الأزرق سيحقق التفاعل.",
      "fr": "De la limaille de fer versée dans la solution bleue fera l'affaire."
    },
    "wrongMsg": {
      "en": "Vinegar doesn't react with copper sulfate this way — no visible change.",
      "ar": "الخل لا يتفاعل مع كبريتات النحاس بهذه الطريقة — لا يوجد تغيّر ملحوظ.",
      "fr": "Le vinaigre ne réagit pas ainsi avec le sulfate de cuivre — aucun changement visible."
    }
  },
  "elephant-toothpaste": {
    "id": "elephant-toothpaste",
    "difficulty": "medium",
    "name": {
      "en": "Elephant Toothpaste",
      "ar": "معجون أسنان الفيل",
      "fr": "Dentifrice d'éléphant"
    },
    "chemicals": [
      "hydrogen_peroxide",
      "potassium_iodide"
    ],
    "distractor": "vinegar",
    "apparatusNeeded": [
      "flask"
    ],
    "effects": {
      "color": "color-amber",
      "heat": false,
      "bubbles": false,
      "precipitate": false,
      "foam": true
    },
    "successMsg": {
      "en": "Foam is erupting out of the flask!",
      "ar": "الرغوة تنفجر خارج الدورق!",
      "fr": "De la mousse jaillit du flacon !"
    },
    "explanation": {
      "en": "Potassium iodide rapidly breaks down the hydrogen peroxide, releasing oxygen gas so fast it whips the solution into a giant foam.",
      "ar": "يوديد البوتاسيوم يحلل بيروكسيد الهيدروجين بسرعة، مطلقًا غاز الأكسجين بسرعة كبيرة تحوّل المحلول إلى رغوة ضخمة.",
      "fr": "L'iodure de potassium décompose rapidement le peroxyde d'hydrogène, libérant du gaz oxygène si vite qu'il transforme la solution en mousse géante."
    },
    "hint": {
      "en": "Hydrogen peroxide needs a catalyst to erupt — skip the vinegar.",
      "ar": "بيروكسيد الهيدروجين يحتاج عامل حفّاز لينفجر — تجاهل الخل.",
      "fr": "Le peroxyde d'hydrogène a besoin d'un catalyseur pour exploser — évite le vinaigre."
    },
    "wrongMsg": {
      "en": "Vinegar doesn't catalyze peroxide breakdown — no eruption.",
      "ar": "الخل لا يحفّز تحلل البيروكسيد — لا يوجد انفجار.",
      "fr": "Le vinaigre ne catalyse pas la décomposition du peroxyde — pas d'éruption."
    }
  },
  "dry-ice-fog": {
    "id": "dry-ice-fog",
    "difficulty": "easy",
    "name": {
      "en": "Dry Ice Fog",
      "ar": "ضباب الثلج الجاف",
      "fr": "Brouillard de glace carbonique"
    },
    "chemicals": [
      "dry_ice",
      "warm_water"
    ],
    "distractor": "baking_soda",
    "apparatusNeeded": [
      "beaker"
    ],
    "effects": {
      "color": "color-clear",
      "heat": false,
      "bubbles": false,
      "precipitate": false,
      "vapor": true
    },
    "successMsg": {
      "en": "Thick white fog is billowing out of the beaker!",
      "ar": "ضباب أبيض كثيف يتصاعد من الكأس!",
      "fr": "Un épais brouillard blanc jaillit du bécher !"
    },
    "explanation": {
      "en": "Dry ice sublimates straight from solid to gas. Warm water speeds this up, and the cold CO₂ condenses moisture in the air into visible fog.",
      "ar": "يتسامى الثلج الجاف من صلب إلى غاز مباشرة. الماء الدافئ يسرّع هذا التسامي، وثاني أكسيد الكربون البارد يكثّف رطوبة الهواء إلى ضباب مرئي.",
      "fr": "La glace carbonique se sublime directement du solide au gaz. L'eau tiède accélère ce processus, et le CO₂ froid condense l'humidité de l'air en un brouillard visible."
    },
    "hint": {
      "en": "Dry ice needs warm water to fog up fast — skip the baking soda.",
      "ar": "الثلج الجاف يحتاج ماءً دافئًا ليتصاعد الضباب بسرعة — تجاهل بيكربونات الصوديوم.",
      "fr": "La glace carbonique a besoin d'eau tiède pour fumer rapidement — évite le bicarbonate de soude."
    },
    "wrongMsg": {
      "en": "Baking soda doesn't speed up sublimation — barely any fog.",
      "ar": "بيكربونات الصوديوم لا تسرّع التسامي — لا يوجد ضباب يُذكر.",
      "fr": "Le bicarbonate de soude n'accélère pas la sublimation — presque pas de brouillard."
    }
  },
  "glowing-luminol": {
    "id": "glowing-luminol",
    "difficulty": "hard",
    "name": {
      "en": "Glowing Luminol",
      "ar": "اللومينول المتوهج",
      "fr": "Luminol lumineux"
    },
    "chemicals": [
      "luminol",
      "hydrogen_peroxide"
    ],
    "distractor": "iron",
    "apparatusNeeded": [
      "testTube"
    ],
    "effects": {
      "color": "color-green",
      "heat": false,
      "bubbles": false,
      "precipitate": false,
      "glow": true
    },
    "successMsg": {
      "en": "The solution is glowing blue-green!",
      "ar": "المحلول يتوهج بلون أزرق مخضر!",
      "fr": "La solution brille en bleu-vert !"
    },
    "explanation": {
      "en": "Oxidizing luminol releases energy as light instead of heat — this \"chemiluminescence\" is the same glow forensic teams use to find trace blood.",
      "ar": "أكسدة اللومينول تُطلق الطاقة على شكل ضوء بدلًا من حرارة — هذا \"التوهج الكيميائي\" هو نفسه الذي تستخدمه الفرق الجنائية للعثور على آثار الدم.",
      "fr": "L'oxydation du luminol libère de l'énergie sous forme de lumière plutôt que de chaleur — cette « chimiluminescence » est la même lueur utilisée par la police scientifique pour trouver des traces de sang."
    },
    "hint": {
      "en": "Luminol needs an oxidizer to glow — the iron filings won't do it.",
      "ar": "اللومينول يحتاج مؤكسدًا ليتوهج — برادة الحديد لن تفعل ذلك.",
      "fr": "Le luminol a besoin d'un oxydant pour briller — la limaille de fer n'y arrivera pas."
    },
    "wrongMsg": {
      "en": "Iron doesn't oxidize luminol this way — no glow.",
      "ar": "الحديد لا يؤكسد اللومينول بهذه الطريقة — لا يوجد توهج.",
      "fr": "Le fer n'oxyde pas le luminol de cette façon — pas de lueur."
    }
  },
  "iron-sulfur": {
    "id": "iron-sulfur",
    "difficulty": "medium",
    "name": {
      "en": "Iron + Sulfur (Exothermic)",
      "ar": "الحديد والكبريت (طارد للحرارة)",
      "fr": "Fer + Soufre (exothermique)"
    },
    "chemicals": [
      "iron",
      "sulfur"
    ],
    "distractor": "zinc",
    "apparatusNeeded": [
      "testTube",
      "burner"
    ],
    "effects": {
      "color": "color-colorless",
      "heat": true,
      "bubbles": false,
      "precipitate": false
    },
    "successMsg": {
      "en": "Black iron sulfide forms — the test tube is hot!",
      "ar": "تتكوّن كبريتيد الحديد الأسود — الأنبوب ساخن!",
      "fr": "Du sulfure de fer noir se forme — le tube à essai est chaud !"
    },
    "explanation": {
      "en": "When heated, iron and sulfur combine directly to form iron sulfide (FeS), a black solid. This is a synthesis reaction that releases significant heat.",
      "ar": "عند التسخين، يتحد الحديد والكبريت مباشرة لتكوين كبريتيد الحديد (FeS)، وهو صلب أسود. هذا تفاعل تركيبي يطلق حرارة كبيرة.",
      "fr": "Chauffés, le fer et le soufre se combinent directement pour former du sulfure de fer (FeS), un solide noir. C'est une réaction de synthèse qui libère beaucoup de chaleur."
    },
    "hint": {
      "en": "Heat iron and sulfur powder together — zinc won't react the same way.",
      "ar": "سخّن مسحوق الحديد والكبريت معًا — الزنك لن يتفاعل بنفس الطريقة.",
      "fr": "Chauffe ensemble la poudre de fer et de soufre — le zinc ne réagira pas de la même façon."
    },
    "wrongMsg": {
      "en": "Zinc and sulfur don't combine readily at this temperature.",
      "ar": "الزنك والكبريت لا يتحدان بسهولة عند هذه درجة الحرارة.",
      "fr": "Le zinc et le soufre ne se combinent pas facilement à cette température."
    }
  },
  "sodium-water": {
    "id": "sodium-water",
    "difficulty": "hard",
    "name": {
      "en": "Sodium + Water (Vigorous)",
      "ar": "الصوديوم والماء (عنيف)",
      "fr": "Sodium + Eau (violent)"
    },
    "chemicals": [
      "sodium",
      "water"
    ],
    "distractor": "potassium",
    "apparatusNeeded": [
      "beaker"
    ],
    "effects": {
      "color": "color-pink",
      "heat": true,
      "bubbles": true,
      "foam": true
    },
    "successMsg": {
      "en": "Sodium skitters across the water, bursting into flames!",
      "ar": "الصوديوم ينزلق عبر الماء، منفجرًا في اللهب!",
      "fr": "Le sodium file à la surface de l'eau en s'enflammant !"
    },
    "explanation": {
      "en": "Sodium reacts violently with water: 2Na + 2H₂O → 2NaOH + H₂↑. The reaction is so exothermic it ignites the hydrogen gas. Never do this with potassium—it's even more dangerous!",
      "ar": "يتفاعل الصوديوم بشدة مع الماء: 2Na + 2H₂O → 2NaOH + H₂↑. التفاعل طارد للحرارة جدًا يشعل غاز الهيدروجين. لا تحاول هذا مع البوتاسيوم—فهو أخطر بكثير!",
      "fr": "Le sodium réagit violemment avec l'eau : 2Na + 2H₂O → 2NaOH + H₂↑. La réaction est si exothermique qu'elle enflamme l'hydrogène gazeux. Ne fais jamais ça avec du potassium — c'est encore plus dangereux !"
    },
    "hint": {
      "en": "Sodium is highly reactive with water — potassium is even worse!",
      "ar": "الصوديوم متفاعل جدًا مع الماء — البوتاسيوم أسوأ بكثير!",
      "fr": "Le sodium est très réactif avec l'eau — le potassium est encore pire !"
    },
    "wrongMsg": {
      "en": "Potassium reacts violently with water — too dangerous for this experiment.",
      "ar": "البوتاسيوم يتفاعل بشدة مع الماء — خطير جدًا لهذه التجربة.",
      "fr": "Le potassium réagit violemment avec l'eau — trop dangereux pour cette expérience."
    }
  },
  "calcium-water": {
    "id": "calcium-water",
    "difficulty": "medium",
    "name": {
      "en": "Calcium + Water",
      "ar": "الكالسيوم والماء",
      "fr": "Calcium + Eau"
    },
    "chemicals": [
      "calcium",
      "water"
    ],
    "distractor": "naoh",
    "apparatusNeeded": [
      "beaker"
    ],
    "effects": {
      "color": "color-clear",
      "heat": false,
      "bubbles": true,
      "foam": true
    },
    "successMsg": {
      "en": "Calcium reacts with water, producing hydrogen gas bubbles!",
      "ar": "يتفاعل الكالسيوم مع الماء، منتجًا فقاعات غاز الهيدروجين!",
      "fr": "Le calcium réagit avec l'eau, produisant des bulles d'hydrogène !"
    },
    "explanation": {
      "en": "Calcium is less reactive than sodium. It slowly reacts with water: Ca + 2H₂O → Ca(OH)₂ + H₂↑. The reaction is much calmer and less exothermic.",
      "ar": "الكالسيوم أقل تفاعلاً من الصوديوم. يتفاعل ببطء مع الماء: Ca + 2H₂O → Ca(OH)₂ + H₂↑. التفاعل أهدأ وأقل طرداً للحرارة.",
      "fr": "Le calcium est moins réactif que le sodium. Il réagit lentement avec l'eau : Ca + 2H₂O → Ca(OH)₂ + H₂↑. La réaction est bien plus calme et moins exothermique."
    },
    "hint": {
      "en": "Calcium reacts with water — sodium hydroxide won't show the same effect.",
      "ar": "الكالسيوم يتفاعل مع الماء — هيدروكسيد الصوديوم لن يُظهر نفس التأثير.",
      "fr": "Le calcium réagit avec l'eau — l'hydroxyde de sodium ne donnera pas le même effet."
    },
    "wrongMsg": {
      "en": "Sodium hydroxide dissolves but doesn't react the same way.",
      "ar": "هيدروكسيد الصوديوم ينحل لكن لا يتفاعل بنفس الطريقة.",
      "fr": "L'hydroxyde de sodium se dissout mais ne réagit pas de la même façon."
    }
  },
  "copper-nitric-acid": {
    "id": "copper-nitric-acid",
    "difficulty": "hard",
    "name": {
      "en": "Copper + Nitric Acid",
      "ar": "النحاس وحمض النيتريك",
      "fr": "Cuivre + Acide nitrique"
    },
    "chemicals": [
      "copper",
      "nitric_acid"
    ],
    "distractor": "sulfuric_acid",
    "apparatusNeeded": [
      "testTube"
    ],
    "effects": {
      "color": "color-copper",
      "heat": true,
      "bubbles": true,
      "vapor": true
    },
    "successMsg": {
      "en": "Copper dissolves, releasing brown nitrogen dioxide gas!",
      "ar": "ينحل النحاس، مطلقًا غاز ثاني أكسيد النيتروجين البني!",
      "fr": "Le cuivre se dissout, libérant du dioxyde d'azote brun !"
    },
    "explanation": {
      "en": "3Cu + 8HNO₃(dilute) → 3Cu(NO₃)₂ + 2NO↑ + 4H₂O. The brown NO₂ gas is toxic. Concentrated nitric acid is even more aggressive.",
      "ar": "3Cu + 8HNO₃(مخفّف) → 3Cu(NO₃)₂ + 2NO↑ + 4H₂O. غاز NO₂ البني سام. حمض النيتريك المركز أكثر عدوانية.",
      "fr": "3Cu + 8HNO₃(dilué) → 3Cu(NO₃)₂ + 2NO↑ + 4H₂O. Le gaz NO₂ brun est toxique. L'acide nitrique concentré est encore plus agressif."
    },
    "hint": {
      "en": "Copper reacts with nitric acid to release brown fumes — sulfuric acid won't do this.",
      "ar": "يتفاعل النحاس مع حمض النيتريك لإطلاق دخان بني — حمض الكبريتيك لن يفعل هذا.",
      "fr": "Le cuivre réagit avec l'acide nitrique en libérant des fumées brunes — l'acide sulfurique ne fera pas ça."
    },
    "wrongMsg": {
      "en": "Sulfuric acid reacts with copper differently — no brown gas here.",
      "ar": "يتفاعل حمض الكبريتيك مع النحاس بشكل مختلف — لا يوجد غاز بني هنا.",
      "fr": "L'acide sulfurique réagit différemment avec le cuivre — pas de gaz brun ici."
    }
  },
  "zinc-copper-displacement": {
    "id": "zinc-copper-displacement",
    "difficulty": "easy",
    "name": {
      "en": "Zinc + Copper Sulfate",
      "ar": "الزنك وكبريتات النحاس",
      "fr": "Zinc + Sulfate de cuivre"
    },
    "chemicals": [
      "zinc",
      "copper_sulfate"
    ],
    "distractor": "iron",
    "apparatusNeeded": [
      "testTube"
    ],
    "effects": {
      "color": "color-red",
      "heat": false,
      "bubbles": false,
      "precipitate": true
    },
    "successMsg": {
      "en": "Copper deposits on the zinc as the blue solution fades to colorless!",
      "ar": "يترسب النحاس على الزنك بينما يتلاشى المحلول الأزرق!",
      "fr": "Le cuivre se dépose sur le zinc pendant que la solution bleue devient incolore !"
    },
    "explanation": {
      "en": "Zinc is more reactive than copper. Zn + CuSO₄ → ZnSO₄ + Cu↓. A displacement reaction where zinc \"steals\" the sulfate from copper.",
      "ar": "الزنك أكثر تفاعلاً من النحاس. Zn + CuSO₄ → ZnSO₄ + Cu↓. تفاعل إحلال حيث يزيح الزنك كبريتات من النحاس.",
      "fr": "Le zinc est plus réactif que le cuivre. Zn + CuSO₄ → ZnSO₄ + Cu↓. Une réaction de déplacement où le zinc « vole » le sulfate au cuivre."
    },
    "hint": {
      "en": "Zinc is more reactive than copper — iron won't displace copper this way.",
      "ar": "الزنك أكثر تفاعلاً من النحاس — الحديد لن يزيح النحاس بهذه الطريقة.",
      "fr": "Le zinc est plus réactif que le cuivre — le fer ne déplacera pas le cuivre de cette façon."
    },
    "wrongMsg": {
      "en": "Iron is less reactive than copper — no displacement occurs.",
      "ar": "الحديد أقل تفاعلاً من النحاس — لا يحدث إزاحة.",
      "fr": "Le fer est moins réactif que le cuivre — aucun déplacement ne se produit."
    }
  },
  "lead-iodide": {
    "id": "lead-iodide",
    "difficulty": "medium",
    "name": {
      "en": "Lead Nitrate + Potassium Iodide",
      "ar": "نترات الرصاص + يوديد البوتاسيوم",
      "fr": "Nitrate de plomb + Iodure de potassium"
    },
    "chemicals": [
      "lead_nitrate",
      "potassium_iodide"
    ],
    "distractor": "sodium_chloride",
    "apparatusNeeded": [
      "beaker"
    ],
    "effects": {
      "color": "color-yellow",
      "heat": false,
      "bubbles": false,
      "precipitate": true
    },
    "successMsg": {
      "en": "A bright yellow precipitate of lead iodide forms!",
      "ar": "يتكوّن راسب أصفر ساطع من يوديد الرصاص!",
      "fr": "Un précipité jaune vif d'iodure de plomb se forme !"
    },
    "explanation": {
      "en": "Pb(NO₃)₂ + 2KI → PbI₂↓ + 2KNO₃. Lead iodide is a striking yellow solid that forms instantly when the two solutions mix.",
      "ar": "Pb(NO₃)₂ + 2KI → PbI₂↓ + 2KNO₃. يوديد الرصاص صلب أصفر ساطع يتكون فوراً عند خلط المحلولين.",
      "fr": "Pb(NO₃)₂ + 2KI → PbI₂↓ + 2KNO₃. L'iodure de plomb est un solide jaune saisissant qui se forme instantanément au mélange des deux solutions."
    },
    "hint": {
      "en": "Lead nitrate reacts with iodide — sodium chloride won't give a yellow precipitate.",
      "ar": "نترات الرصاص تتفاعل مع اليوديد — كلوريد الصوديوم لن ينتج راسب أصفر.",
      "fr": "Le nitrate de plomb réagit avec l'iodure — le chlorure de sodium ne donnera pas de précipité jaune."
    },
    "wrongMsg": {
      "en": "Sodium chloride with lead nitrate doesn't produce a yellow precipitate.",
      "ar": "كلوريد الصوديوم مع نترات الرصاص لا ينتج راسب أصفر.",
      "fr": "Le chlorure de sodium avec le nitrate de plomb ne produit pas de précipité jaune."
    }
  },
  "starch-iodine": {
    "id": "starch-iodine",
    "difficulty": "easy",
    "name": {
      "en": "Starch + Iodine (Color)",
      "ar": "النشا واليود (اللون)",
      "fr": "Amidon + Iode (couleur)"
    },
    "chemicals": [
      "starch",
      "iodine"
    ],
    "distractor": "glucose",
    "apparatusNeeded": [
      "beaker"
    ],
    "effects": {
      "color": "color-blue",
      "heat": false,
      "bubbles": false,
      "precipitate": false
    },
    "successMsg": {
      "en": "The mixture turns deep blue-black — the classic starch-iodine test!",
      "ar": "يتحول الخليط إلى أزرق-أسود عميق — اختبار النشا-اليود الكلاسيكي!",
      "fr": "Le mélange devient bleu-noir profond — le test classique amidon-iode !"
    },
    "explanation": {
      "en": "Iodine molecules fit inside the helical structure of starch, creating a blue-black complex. This is a famous test to detect starch in food.",
      "ar": "تتناسب جزيئات اليود داخل البنية الحلزونية للنشا، مما ينشئ معقد أزرق-أسود. هذا اختبار مشهور للكشف عن النشا في الغذاء.",
      "fr": "Les molécules d'iode se logent dans la structure hélicoïdale de l'amidon, créant un complexe bleu-noir. C'est un test célèbre pour détecter l'amidon dans les aliments."
    },
    "hint": {
      "en": "Iodine forms a dark complex with starch — glucose won't give the same color.",
      "ar": "يكون اليود معقد داكن مع النشا — الجلوكوز لن يعطي نفس اللون.",
      "fr": "L'iode forme un complexe foncé avec l'amidon — le glucose ne donnera pas la même couleur."
    },
    "wrongMsg": {
      "en": "Glucose doesn't turn blue-black with iodine — no color change.",
      "ar": "الجلوكوز لا يتحول إلى أزرق-أسود مع اليود — لا تغيير في اللون.",
      "fr": "Le glucose ne devient pas bleu-noir avec l'iode — pas de changement de couleur."
    }
  },
  "manganese-h2o2": {
    "id": "manganese-h2o2",
    "difficulty": "medium",
    "name": {
      "en": "Manganese Dioxide Catalyst",
      "ar": "عامل MnO₂ الحفّاز",
      "fr": "Catalyseur au dioxyde de manganèse"
    },
    "chemicals": [
      "manganese_dioxide",
      "hydrogen_peroxide"
    ],
    "distractor": "iron_oxide",
    "apparatusNeeded": [
      "flask"
    ],
    "effects": {
      "color": "color-clear",
      "heat": false,
      "bubbles": true,
      "foam": false
    },
    "successMsg": {
      "en": "Vigorous bubbling! Oxygen gas is released rapidly.",
      "ar": "فوران عنيف! يتم إطلاق غاز الأكسجين بسرعة.",
      "fr": "Bouillonnement intense ! Du gaz oxygène est libéré rapidement."
    },
    "explanation": {
      "en": "2H₂O₂ → 2H₂O + O₂↑. MnO₂ acts as a catalyst, speeding up decomposition without being consumed. Iron oxide doesn't catalyze this reaction.",
      "ar": "2H₂O₂ → 2H₂O + O₂↑. يعمل MnO₂ كعامل حفّاز، يسرع التحلل دون أن يُستهلك. أكسيد الحديد لا يحفز هذا التفاعل.",
      "fr": "2H₂O₂ → 2H₂O + O₂↑. Le MnO₂ agit comme catalyseur, accélérant la décomposition sans être consommé. L'oxyde de fer ne catalyse pas cette réaction."
    },
    "hint": {
      "en": "Manganese dioxide is a catalyst for H₂O₂ decomposition — iron oxide won't work.",
      "ar": "ثاني أكسيد المنجنيز عامل حفّاز لتحلل بيروكسيد الهيدروجين — أكسيد الحديد لن ينجح.",
      "fr": "Le dioxyde de manganèse est un catalyseur pour la décomposition de H₂O₂ — l'oxyde de fer ne fonctionnera pas."
    },
    "wrongMsg": {
      "en": "Iron oxide doesn't effectively catalyze hydrogen peroxide decomposition.",
      "ar": "أكسيد الحديد لا يحفز بفعالية تحلل بيروكسيد الهيدروجين.",
      "fr": "L'oxyde de fer ne catalyse pas efficacement la décomposition du peroxyde d'hydrogène."
    }
  },
  "sugar-h2so4": {
    "id": "sugar-h2so4",
    "difficulty": "hard",
    "name": {
      "en": "Sugar + Sulfuric Acid (Dehydration)",
      "ar": "السكر وحمض الكبريتيك (الجفاف)",
      "fr": "Sucre + Acide sulfurique (déshydratation)"
    },
    "chemicals": [
      "sugar",
      "sulfuric_acid"
    ],
    "distractor": "hydrochloric_acid",
    "apparatusNeeded": [
      "beaker",
      "burner"
    ],
    "effects": {
      "color": "color-black",
      "heat": true,
      "bubbles": true,
      "foam": true
    },
    "successMsg": {
      "en": "The sugar blackens into charcoal as water boils off!",
      "ar": "يتحول السكر إلى فحم أسود بينما يتبخر الماء!",
      "fr": "Le sucre noircit en charbon pendant que l'eau s'évapore !"
    },
    "explanation": {
      "en": "C₁₂H₂₂O₁₁ -H₂SO₄→ 12C + H₂O (steam). Sulfuric acid dehydrates the sugar, removing all water and leaving pure carbon. This is a dramatic exothermic reaction!",
      "ar": "C₁₂H₂₂O₁₁ -H₂SO₄→ 12C + H₂O (بخار). يجفف حمض الكبريتيك السكر، مزيلاً كل الماء تاركاً كربون نقي. هذا تفاعل طارد للحرارة درامي!",
      "fr": "C₁₂H₂₂O₁₁ -H₂SO₄→ 12C + H₂O (vapeur). L'acide sulfurique déshydrate le sucre, retirant toute l'eau et ne laissant que du carbone pur. Une réaction exothermique spectaculaire !"
    },
    "hint": {
      "en": "Concentrated sulfuric acid dehydrates sugar — hydrochloric acid won't have the same effect.",
      "ar": "حمض الكبريتيك المركز يجفف السكر — حمض الهيدروكلوريك لن يكون له نفس التأثير.",
      "fr": "L'acide sulfurique concentré déshydrate le sucre — l'acide chlorhydrique n'aura pas le même effet."
    },
    "wrongMsg": {
      "en": "Hydrochloric acid doesn't dehydrate sugar effectively — the dramatic blackening won't occur.",
      "ar": "حمض الهيدروكلوريك لا يجفف السكر بفعالية — الاسوداد الدرامي لن يحدث.",
      "fr": "L'acide chlorhydrique ne déshydrate pas efficacement le sucre — le noircissement spectaculaire ne se produira pas."
    }
  },
  "aluminum-naoh": {
    "id": "aluminum-naoh",
    "difficulty": "hard",
    "name": {
      "en": "Aluminum + Sodium Hydroxide",
      "ar": "الألومنيوم وهيدروكسيد الصوديوم",
      "fr": "Aluminium + Hydroxyde de sodium"
    },
    "chemicals": [
      "aluminum",
      "naoh"
    ],
    "distractor": "vinegar",
    "apparatusNeeded": [
      "flask"
    ],
    "effects": {
      "color": "color-clear",
      "heat": true,
      "bubbles": true,
      "foam": true
    },
    "successMsg": {
      "en": "Rapid bubbling of hydrogen gas — the flask gets hot!",
      "ar": "فوران سريع لغاز الهيدروجين — يسخن الدورق!",
      "fr": "Bouillonnement rapide d'hydrogène gazeux — le flacon chauffe !"
    },
    "explanation": {
      "en": "2Al + 2NaOH + 2H₂O → 2NaAlO₂ + 3H₂↑. Aluminum is amphoteric—it reacts with both acids AND bases. The reaction is exothermic.",
      "ar": "2Al + 2NaOH + 2H₂O → 2NaAlO₂ + 3H₂↑. الألومنيوم مادة برمائية—تتفاعل مع الحمضيات والقواعد. التفاعل طارد للحرارة.",
      "fr": "2Al + 2NaOH + 2H₂O → 2NaAlO₂ + 3H₂↑. L'aluminium est amphotère — il réagit à la fois avec les acides ET les bases. La réaction est exothermique."
    },
    "hint": {
      "en": "Aluminum reacts with bases, not acids — vinegar won't work the same way.",
      "ar": "يتفاعل الألومنيوم مع القواعد وليس الحمضيات — الخل لن ينجح بنفس الطريقة.",
      "fr": "L'aluminium réagit avec les bases, pas les acides — le vinaigre ne fonctionnera pas de la même façon."
    },
    "wrongMsg": {
      "en": "Vinegar is too weak — aluminum needs a strong base like sodium hydroxide.",
      "ar": "الخل ضعيف جداً — يحتاج الألومنيوم إلى قاعدة قوية مثل هيدروكسيد الصوديوم.",
      "fr": "Le vinaigre est trop faible — l'aluminium a besoin d'une base forte comme l'hydroxyde de sodium."
    }
  }
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
  let leaderboardInterval = null; // legacy — superseded by teacherLeaderboardUnsubscribe below
  let teacherLeaderboardUnsubscribe = null; // stops the Firebase onValue listener when leaving the monitoring view

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
      
      // Stop listening for live leaderboard updates only if leaving teacher-setup
      if (pageId !== 'teacher-setup' && teacherLeaderboardUnsubscribe) {
        console.log('🛑 Stopping live leaderboard updates');
        teacherLeaderboardUnsubscribe();
        teacherLeaderboardUnsubscribe = null;
      }
      
      // Re-attach the live listener if returning to teacher-setup with an
      // active class competition (e.g. the teacher navigated away and back).
      if (pageId === 'teacher-setup' && competition.mode === 'class' && competition.code && !teacherLeaderboardUnsubscribe && window.chemLabCloud && window.chemLabCloud.ready) {
        console.log('▶️  Re-attaching live leaderboard listener');
        teacherLeaderboardUnsubscribe = window.chemLabCloud.listenToCompetition(competition.code, (data) => {
          if (!data) return;
          competition.students = data.students || {};
          updateTeacherLeaderboard();
        });
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
    if (id === 'resultModal' && tutorial.active) tutorial.onResultModalClosed();
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

    // Guided experiments use a fixed apparatus — the selector is only
    // meaningful (and only wired up) in Free Mode, so hide it here.
    const selectorEl = document.getElementById('apparatusSelector');
    if (selectorEl) selectorEl.classList.add('is-hidden-tool');

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
    updateBoard(I18N[state.lang].lab_default_title, I18N[state.lang].board_free_sub);
    // Visibility is narrowed to just the Beaker by initApparatusSelector()
    // below (it used to show all three glassware pieces at once here, which
    // defeated the point of the selector and ate a lot of screen space).

    // The apparatus selector only makes sense in Free Mode — reveal it here
    // (guided experiments hide it in renderExperimentInLab).
    const selectorEl = document.getElementById('apparatusSelector');
    if (selectorEl) selectorEl.classList.remove('is-hidden-tool');

    // === Raw elements only (no compounds) — the full periodic set this
    //     lab models, not just the original starter 6. Mix any two (or
    //     three) to try to discover a compound. ===
    el.bottleRow.innerHTML = '';
    RAW_ELEMENTS.forEach((elementId) => {
      if (CHEMICALS[elementId]) {
        el.bottleRow.appendChild(buildBottleEl(elementId));
      }
    });

    // === Compounds discovered in earlier sessions (or earlier this visit)
    //     re-join the shelf as regular, fully usable substances. ===
    state.discovered.forEach((compoundId) => {
      if (CHEMICALS[compoundId] && !el.bottleRow.querySelector(`[data-chemical-id="${compoundId}"]`)) {
        el.bottleRow.appendChild(buildBottleEl(compoundId));
      }
    });

    // === Initialize apparatus selector with Beaker selected by default ===
    initApparatusSelector();
    
    resetApparatusVisuals();
    
    // Update message with detailed instructions
    const welcomeMsg = I18N[state.lang].msg_welcome_free;
    logMessage(welcomeMsg, 'info');
  }

  /** Called when a Free Lab mix produces a named compound (see FREE_REACTIONS
   *  `produces`). Adds it to the shelf as a brand-new, fully usable bottle —
   *  draggable, droppable, with its own info card — and remembers it across
   *  visits (localStorage), exactly like a real substance you've stocked. */
  function discoverCompound(chemId) {
    if (!CHEMICALS[chemId]) return;
    if (!state.discovered.includes(chemId)) {
      state.discovered.push(chemId);
      localStorage.setItem('chemlab_discovered', JSON.stringify(state.discovered));
    }
    if (!el.bottleRow.querySelector(`[data-chemical-id="${chemId}"]`)) {
      const bottle = buildBottleEl(chemId);
      bottle.classList.add('is-newly-made');
      el.bottleRow.appendChild(bottle);
    }
  }

  /** Initialize the apparatus selector buttons (Beaker, Test Tube, Flask) */
  let apparatusSelectorReady = false;
  function initApparatusSelector() {
    const buttons = document.querySelectorAll('.apparatus-icon');
    buttons.forEach((btn) => {
      btn.classList.remove('active');
      // Guard against re-attaching a duplicate listener every time Free
      // Mode is (re-)entered — each click used to fire handleApparatusSelect
      // once per prior visit, which got worse the more you navigated around.
      if (!apparatusSelectorReady) {
        btn.addEventListener('click', () => handleApparatusSelect(btn.dataset.container));
      }
    });
    apparatusSelectorReady = true;

    // Set Beaker as default — and show ONLY it, not all three at once.
    document.querySelector('[data-container="beaker"]').classList.add('active');
    setSelectedApparatus('beaker');
    updateApparatusVisibility(['beaker']);
  }

  /** Handle apparatus selection from selector icons */
  function handleApparatusSelect(containerId) {
    const buttons = document.querySelectorAll('.apparatus-icon');
    buttons.forEach((btn) => btn.classList.remove('active'));
    document.querySelector(`[data-container="${containerId}"]`).classList.add('active');
    
    setSelectedApparatus(containerId);
    // Show only the chosen glassware — previously all three stayed visible
    // no matter which one was "selected", which was both confusing and
    // wasted a lot of vertical space on small screens.
    updateApparatusVisibility([containerId]);
    const containerNames = { beaker: I18N[state.lang].label_beaker, testTube: I18N[state.lang].label_testtube, flask: I18N[state.lang].label_flask };
    logMessage(`${I18N[state.lang].msg_selected}${containerNames[containerId] || containerId}`, 'info');
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
        logMessage(I18N[state.lang].select_container, 'warning');
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
      if (tutorial.active) tutorial.notifyChemicalAdded(chemId);

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

    apRefs.liquid.style.height = '70%';

    if (isMatch || freeReaction) {
      // Only lock the apparatus on an actual match — guided experiments
      // always expect exactly 2 chemicals, so this doesn't change their
      // behavior, but it's what makes a 3-way Free Lab combination (like
      // carbon + hydrogen + oxygen) reachable at all: previously the
      // apparatus locked after any 2nd chemical regardless of outcome, so
      // there was never a way to add a 3rd and try again.
      apState.resolved = true;
      // ---- SUCCESS: Apply reaction effects ----
      const reaction = isMatch ? exp.effects : freeReaction;
      const message = isMatch ? exp.successMsg[state.lang] : freeReaction.result.text[state.lang];
      const color = isMatch ? exp.effects.color : freeReaction.result.color;
      
      // Visual effects are purely cosmetic — if any one of them throws, the
      // experiment must STILL be counted and the result popup STILL shown.
      // (A missing bubble/precipitate layer on one piece of glassware used
      // to throw here, which silently swallowed the completion message for
      // those experiments.)
      try {
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
      } catch (fxErr) {
        console.error('⚠️ Reaction visual effect failed (completion still proceeds):', fxErr);
      }

      logMessage(message, 'success');
      if (!isFreeMode) awardScore(exp);
      if (isFreeMode && freeReaction && freeReaction.produces) discoverCompound(freeReaction.produces);
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
          title: { en: 'No Reaction', ar: 'لا يوجد تفاعل', fr: 'Aucune réaction' }[state.lang],
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
    if (!container) return; // glassware without a bubble layer: skip, never crash
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
    if (!container) return; // glassware without a precipitate layer: skip, never crash
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

  /* ================================================================
     FIRST-VISIT TUTORIAL
     A short, skippable walk-through shown automatically the very
     first time someone opens the site (localStorage-gated so it
     never repeats): a quick tour of the header, then a hands-on
     "make water" walk-through in Free Lab. Degrades gracefully if a
     target element is hidden (e.g. nav links collapsed into the
     mobile menu) by showing a centered card instead of a broken
     zero-size spotlight.
  ================================================================ */
  const tutorial = {
    active: false,
    stepIndex: 0,
    rootEl: null,
    spotlightEl: null,
    tooltipEl: null,
    textEl: null,
    skipBtn: null,
    nextBtn: null,
    waitingForModalClose: false,

    getSteps() {
      const t = I18N[state.lang];
      return [
        { kind: 'modal', text: t.tut_welcome, button: t.tut_start },
        // The three real sections, shown on their own picker page — a much
        // clearer "here are your three options" than scattered header links.
        {
          kind: 'highlight', selector: '[data-mode="solo"]', text: t.tut_mode_solo, button: t.tut_next,
          onEnter: () => showPage('mode-select'),
        },
        { kind: 'highlight', selector: '[data-mode="free"]', text: t.tut_mode_free, button: t.tut_next },
        { kind: 'highlight', selector: '[data-mode="class"]', text: t.tut_mode_class, button: t.tut_next },
        {
          kind: 'modal', text: t.tut_before_water, button: t.tut_lets_go,
          onEnter: () => { showFreeMode(); showPage('lab'); },
        },
        { kind: 'highlight', selector: '[data-chemical-id="hydrogen"]', text: t.tut_drag_h, waitChem: 'hydrogen' },
        { kind: 'highlight', selector: '[data-chemical-id="oxygen"]', text: t.tut_drag_o, waitChem: 'oxygen' },
        { kind: 'modal', text: t.tut_done, button: t.tut_finish, final: true },
      ];
    },

    start() {
      if (!this.rootEl) this.buildOverlay();
      this.active = true;
      this.stepIndex = 0;
      this.renderStep();
    },

    buildOverlay() {
      this.rootEl = document.createElement('div');
      this.rootEl.className = 'tutorial-root';
      this.rootEl.innerHTML = `
        <div class="tutorial-spotlight" id="tutorialSpotlight" hidden></div>
        <div class="tutorial-tooltip" id="tutorialTooltip" hidden>
          <p class="tutorial-text" id="tutorialText"></p>
          <div class="tutorial-actions" id="tutorialActions">
            <button class="tutorial-skip" id="tutorialSkip" type="button"></button>
            <button class="btn btn-primary tutorial-next" id="tutorialNext" type="button"></button>
          </div>
        </div>
      `;
      document.body.appendChild(this.rootEl);
      this.spotlightEl = this.rootEl.querySelector('#tutorialSpotlight');
      this.tooltipEl = this.rootEl.querySelector('#tutorialTooltip');
      this.textEl = this.rootEl.querySelector('#tutorialText');
      this.skipBtn = this.rootEl.querySelector('#tutorialSkip');
      this.nextBtn = this.rootEl.querySelector('#tutorialNext');
      this.skipBtn.addEventListener('click', () => this.end());
      this.nextBtn.addEventListener('click', () => this.handleNextClick());
      window.addEventListener('resize', () => this.positionToTarget());
      // getBoundingClientRect() is viewport-relative, so scrolling moves the
      // target without moving its rect's top/left automatically updating
      // here — listen with capture:true so this also fires for scrolling
      // *inside* the chemical shelf (its own overflow-y/overflow-x scroll),
      // not just the page itself, otherwise the highlight box stays stuck
      // at its old position the moment either one is scrolled.
      window.addEventListener('scroll', () => this.positionToTarget(), true);
    },

    renderStep() {
      const step = this.getSteps()[this.stepIndex];
      if (!step) { this.end(); return; }
      if (step.onEnter) step.onEnter();

      this.skipBtn.textContent = I18N[state.lang].tut_skip;
      this.textEl.textContent = step.text;

      if (step.waitChem) {
        // Hands-on step: no Next button — advancing happens automatically
        // once the right chemical is actually added.
        this.nextBtn.hidden = true;
        this.currentWaitChem = step.waitChem;
      } else {
        this.nextBtn.hidden = false;
        this.nextBtn.textContent = step.button || I18N[state.lang].tut_next;
        this.currentWaitChem = null;
      }

      const target = step.selector ? document.querySelector(step.selector) : null;
      const visible = target && target.offsetParent !== null;

      if (step.kind === 'highlight' && visible) {
        this.tooltipEl.classList.remove('is-centered');
        this.spotlightEl.hidden = false;
        this.spotlightEl.classList.remove('is-fullscreen');
        this.currentTarget = target;
        this.positionToTarget();
      } else {
        // Either a 'modal' step, or the target isn't visible right now
        // (e.g. nav collapsed behind the mobile hamburger) — fall back
        // to a plain centered card instead of a broken highlight box.
        this.currentTarget = null;
        this.spotlightEl.hidden = false;
        this.spotlightEl.classList.add('is-fullscreen');
        this.spotlightEl.style.top = '0'; this.spotlightEl.style.left = '0';
        this.spotlightEl.style.width = '0'; this.spotlightEl.style.height = '0';
        this.tooltipEl.classList.add('is-centered');
        this.tooltipEl.style.top = ''; this.tooltipEl.style.left = '';
      }
      this.tooltipEl.hidden = false;
    },

    positionToTarget() {
      if (!this.currentTarget || !this.spotlightEl) return;
      const r = this.currentTarget.getBoundingClientRect();
      const pad = 8;
      this.spotlightEl.style.top = `${r.top - pad}px`;
      this.spotlightEl.style.left = `${r.left - pad}px`;
      this.spotlightEl.style.width = `${r.width + pad * 2}px`;
      this.spotlightEl.style.height = `${r.height + pad * 2}px`;

      // Put the tooltip below the target if there's room, otherwise above.
      const spaceBelow = window.innerHeight - r.bottom;
      const tooltipH = this.tooltipEl.offsetHeight || 140;
      const top = spaceBelow > tooltipH + 24 ? r.bottom + 16 : Math.max(12, r.top - tooltipH - 16);
      const left = Math.min(Math.max(12, r.left), window.innerWidth - this.tooltipEl.offsetWidth - 12);
      this.tooltipEl.style.top = `${top}px`;
      this.tooltipEl.style.left = `${left}px`;
    },

    handleNextClick() {
      const step = this.getSteps()[this.stepIndex];
      if (step && step.final) {
        this.end();
        showPage('home');
        return;
      }
      this.stepIndex += 1;
      this.renderStep();
    },

    /** Called from handleAddChemical() whenever a chemical is successfully
     *  added, while the tutorial is active. */
    notifyChemicalAdded(chemId) {
      if (!this.active || !this.currentWaitChem) return;
      if (chemId !== this.currentWaitChem) return;
      this.currentWaitChem = null;
      if (this.getSteps()[this.stepIndex].selector === '[data-chemical-id="oxygen"]') {
        // That was the Oxygen step — a reaction (and its result popup) is
        // about to run on its own. Step back out of the way and wait for
        // that popup to close before showing the final tutorial card.
        this.tooltipEl.hidden = true;
        this.spotlightEl.hidden = true;
        this.waitingForModalClose = true;
      } else {
        this.stepIndex += 1;
        this.renderStep();
      }
    },

    /** Called from closeModal() whenever #resultModal closes. */
    onResultModalClosed() {
      if (!this.active || !this.waitingForModalClose) return;
      this.waitingForModalClose = false;
      this.stepIndex += 1;
      this.renderStep();
    },

    end() {
      this.active = false;
      this.waitingForModalClose = false;
      localStorage.setItem('chemlab_tutorial_seen', '1');
      if (this.rootEl) this.rootEl.remove();
      this.rootEl = null;
    },
  };

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
      APPARATUS_IDS.testTube = { el: $('#testTube'), liquid: $('#testTubeLiquid'), bubbles: $('#testTubeBubbles'), precipitate: $('#testTubePrecipitate') };
      APPARATUS_IDS.flask = { el: $('#flask'), liquid: $('#flaskLiquid'), bubbles: $('#flaskBubbles'), precipitate: $('#flaskPrecipitate') };
      
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
        state.lang = nextLang(state.lang);
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

        // Class mode: advance through the teacher's selected list.
        // Solo mode (and any other guided-experiment context): advance
        // through the full 16-experiment grid order instead of just
        // dumping back to the grid — "Next" should actually mean next.
        const sequence = (competition.mode === 'class' && competition.studentName && competition.selectedExperiments && competition.selectedExperiments.length > 0)
          ? competition.selectedExperiments
          : ALL_EXPERIMENT_IDS;

        const currentIdx = sequence.indexOf(state.currentExperimentId);
        const nextIdx = currentIdx + 1;

        console.log(`Index: ${currentIdx} → ${nextIdx}/${sequence.length}`, sequence);

        if (currentIdx !== -1 && nextIdx < sequence.length) {
          const nextExpId = sequence[nextIdx];
          console.log(`📌 LOADING: ${nextExpId}`);
          renderExperimentInLab(nextExpId);
          showPage('lab');
        } else {
          console.log('✅ ALL DONE (or free mode) - Going to experiments');
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
        else if (page === 'lab') { showFreeMode(); showPage('lab'); }
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
      if (!localStorage.getItem('chemlab_tutorial_seen')) {
        setTimeout(() => tutorial.start(), 500);
      }
    });
  }

  // Optional hand-tracking module (hand-tracking.js) talks to us only
  // through this one event — the core app has zero dependency on it,
  // and works identically whether or not that file is even present.
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

  /** Turn a millisecond duration into "m:ss" for the leaderboard (e.g. 3:07). */
  function formatDuration(ms) {
    const totalSeconds = Math.max(0, Math.round(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
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
      // Was previously inline legacy code that dumped ALL chemicals
      // (compounds included) onto the shelf and never wired up the
      // apparatus selector. showFreeMode() is the maintained version
      // (curated raw elements, sticky shelf, discoverable compounds,
      // working apparatus selector) — use it here too.
      showFreeMode();
      showPage('lab');
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
    
    if (!window.chemLabCloud || !window.chemLabCloud.ready) {
      alert(I18N[state.lang].msg_cloud_unavailable || 'Could not connect to the server — check your internet connection and reload the page.');
      console.error('❌ chemLabCloud not ready — cannot create a cross-device competition');
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

    // Push to Firebase — this is what makes the code reachable from a
    // student's own device, not just this one.
    window.chemLabCloud.saveCompetition(competition.code, {
      teacherId: window.chemLabCloud.uid, // only this device's auth ID may edit/delete this competition later
      selectedExperiments: competition.selectedExperiments,
      students: {},
      startTime: competition.startTime,
    }).catch((err) => {
      console.error('❌ Failed to save competition to the cloud:', err);
      alert(I18N[state.lang].msg_cloud_unavailable || 'Could not connect to the server — check your internet connection and reload the page.');
    });

    saveCompetitionData(); // local cache only now, not the source of truth

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

    // Live updates (replaces the old 1-second localStorage poll, which
    // only ever re-read THIS device's own storage and could never see a
    // student joining from elsewhere). onValue pushes new data the moment
    // Firebase sees a change, from any device.
    console.log('📊 Listening for live leaderboard updates...');
    if (teacherLeaderboardUnsubscribe) teacherLeaderboardUnsubscribe();
    teacherLeaderboardUnsubscribe = window.chemLabCloud.listenToCompetition(competition.code, (data) => {
      if (!data) return;
      competition.students = data.students || {};
      updateTeacherLeaderboard();
    });

    updateTeacherLeaderboard();
    console.log('✅ Teacher monitoring view displayed');
  }

  function updateTeacherLeaderboard() {
    const leaderboard = document.getElementById('teacherLeaderboard');
    if (!leaderboard) {
      console.warn('⚠️ Leaderboard element not found');
      return;
    }

    const totalExperiments = competition.selectedExperiments.length;

    // Keep the "X/30 joined" badge in sync too.
    const countCurrentEl = document.getElementById('studentCountCurrent');
    const countMaxEl = document.getElementById('studentCountMax');
    const countBadgeEl = document.getElementById('studentCountBadge');
    const studentCount = Object.keys(competition.students).length;
    if (countCurrentEl) countCurrentEl.textContent = studentCount;
    if (countMaxEl) countMaxEl.textContent = MAX_STUDENTS_PER_COMPETITION;
    if (countBadgeEl) countBadgeEl.classList.toggle('is-full', studentCount >= MAX_STUDENTS_PER_COMPETITION);

    const students = Object.entries(competition.students)
      .sort((a, b) => {
        const aDone = a[1].completed === totalExperiments && a[1].finishTime;
        const bDone = b[1].completed === totalExperiments && b[1].finishTime;
        // Finished students always outrank unfinished ones...
        if (aDone !== bDone) return aDone ? -1 : 1;
        // ...and among finishers, fastest total time wins — this is the
        // actual "race" ranking, not just who happened to join first.
        if (aDone && bDone) {
          return (a[1].finishTime - a[1].startTime) - (b[1].finishTime - b[1].startTime);
        }
        // Still-in-progress students: most completed first, then who
        // started earliest as a tiebreaker (unchanged from before).
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

    leaderboard.innerHTML = students.map((entry, idx) => {
      const [name, data] = entry;
      const percentage = Math.round((data.completed / totalExperiments) * 100);
      const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '•';
      const isDone = data.completed === totalExperiments && data.finishTime;
      const status = isDone
        ? `✅ ${formatDuration(data.finishTime - data.startTime)}`
        : '⏳';
      
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

  async function handleStudentJoin() {
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

    if (!window.chemLabCloud || !window.chemLabCloud.ready) {
      const msg = I18N[state.lang].msg_cloud_unavailable || 'Could not connect to the server — check your internet connection and reload the page.';
      if (error) { error.textContent = msg; error.removeAttribute('hidden'); }
      console.error('❌ chemLabCloud not ready — cannot join a competition');
      return;
    }

    // Fetch the teacher's competition from Firebase — this is the part
    // that makes a code created on a different device actually reachable.
    const joinBtn = document.getElementById('joinCompetitionBtn');
    if (joinBtn) joinBtn.disabled = true;
    let remoteData;
    try {
      remoteData = await window.chemLabCloud.loadCompetition(code);
    } catch (err) {
      console.error('❌ Failed to reach the server:', err);
      const msg = I18N[state.lang].msg_cloud_unavailable || 'Could not connect to the server — check your internet connection and reload the page.';
      if (error) { error.textContent = msg; error.removeAttribute('hidden'); }
      if (joinBtn) joinBtn.disabled = false;
      return;
    }
    if (joinBtn) joinBtn.disabled = false;

    console.log('📊 Loaded competition data from server:', remoteData);

    // Validate competition code
    if (!remoteData) {
      const msg = I18N[state.lang].msg_invalid_code || 'Invalid competition code';
      if (error) {
        error.textContent = msg;
        error.removeAttribute('hidden');
      }
      console.error('❌ No competition found for code:', code);
      return;
    }

    competition.code = code;
    competition.selectedExperiments = remoteData.selectedExperiments || [];
    competition.students = remoteData.students || {};

    // Validate that experiments exist
    if (competition.selectedExperiments.length === 0) {
      const msg = 'No experiments in this competition';
      if (error) {
        error.textContent = msg;
        error.removeAttribute('hidden');
      }
      console.error('❌ No selected experiments');
      return;
    }

    // Enforce the classroom-size cap — but only for someone genuinely NEW;
    // a student re-joining (e.g. after refreshing their page) must still
    // get back in even if the room is "full", since they already have a seat.
    const isNewStudent = !competition.students[name];
    if (isNewStudent && Object.keys(competition.students).length >= MAX_STUDENTS_PER_COMPETITION) {
      const msg = I18N[state.lang].msg_competition_full || `This competition is full (max ${MAX_STUDENTS_PER_COMPETITION} students)`;
      if (error) { error.textContent = msg; error.removeAttribute('hidden'); }
      console.warn('❌ Competition full:', code);
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

    // Write this student's record to the server so the teacher's screen
    // (on a completely different device) sees them join in real time.
    try {
      await window.chemLabCloud.saveStudent(code, name, competition.students[name]);
    } catch (err) {
      console.error('❌ Failed to register with the server:', err);
      const msg = I18N[state.lang].msg_cloud_unavailable || 'Could not connect to the server — check your internet connection and reload the page.';
      if (error) { error.textContent = msg; error.removeAttribute('hidden'); }
      return;
    }

    saveCompetitionData(); // local cache so a page refresh remembers this student's session

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

      // The moment a student finishes their LAST assigned experiment, lock
      // in how long that took — this is what lets the leaderboard rank
      // finished students by speed instead of just completion count.
      // (Guarded so finishing again, or completing extra experiments
      // beyond the assigned set, never overwrites the original time.)
      const totalAssigned = competition.selectedExperiments.length;
      if (student.completed === totalAssigned && !student.finishTime) {
        student.finishTime = Date.now();
        console.log(`🏁 Finished all ${totalAssigned} experiments in ${Math.round((student.finishTime - student.startTime) / 1000)}s`);
      }

      console.log(`✅ Experiment completed: ${experimentId}`);
      console.log(`📊 Student progress: ${student.completed}/${competition.selectedExperiments.length}`);
      
      saveCompetitionData();

      // Push just this student's record to the server — the teacher's
      // live listener (on their own device) picks this up instantly.
      if (window.chemLabCloud && window.chemLabCloud.ready && competition.code) {
        window.chemLabCloud.saveStudent(competition.code, competition.studentName, student)
          .then(() => console.log('✅ Progress synced to server'))
          .catch((err) => console.error('❌ Failed to sync progress to server:', err));
      }
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

      // Stop listening and remove the competition from the server so old
      // codes can't be reused accidentally.
      if (teacherLeaderboardUnsubscribe) {
        teacherLeaderboardUnsubscribe();
        teacherLeaderboardUnsubscribe = null;
      }
      if (window.chemLabCloud && window.chemLabCloud.ready && finalCode) {
        window.chemLabCloud.deleteCompetition(finalCode)
          .catch((err) => console.error('❌ Failed to delete competition from server:', err));
      }

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
