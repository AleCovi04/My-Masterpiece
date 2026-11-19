// Citazioni della Panoramica: classici di pubblico dominio, con autore e opera.
// Solo frasi con un'attribuzione verificabile; traduzioni dai testi originali.
// Per aggiungerne una: una riga in QUOTES (l'ordine non conta, la rotazione le mescola).

type Pair = { it: string; en: string }

const AUTHORS = {
  seneca: { it: 'Seneca', en: 'Seneca' },
  marcus: { it: 'Marco Aurelio', en: 'Marcus Aurelius' },
  epictetus: { it: 'Epitteto', en: 'Epictetus' },
  musonius: { it: 'Musonio Rufo', en: 'Musonius Rufus' },
  aristotle: { it: 'Aristotele', en: 'Aristotle' },
  heraclitus: { it: 'Eraclito', en: 'Heraclitus' },
  plato: { it: 'Platone', en: 'Plato' },
  socrates: { it: 'Socrate', en: 'Socrates' },
  laozi: { it: 'Laozi', en: 'Lao Tzu' },
  confucius: { it: 'Confucio', en: 'Confucius' },
  nietzsche: { it: 'Friedrich Nietzsche', en: 'Friedrich Nietzsche' },
  goethe: {
    it: 'Johann Wolfgang von Goethe',
    en: 'Johann Wolfgang von Goethe',
  },
  montaigne: { it: 'Michel de Montaigne', en: 'Michel de Montaigne' },
  syrus: { it: 'Publilio Siro', en: 'Publilius Syrus' },
  horace: { it: 'Orazio', en: 'Horace' },
  virgil: { it: 'Virgilio', en: 'Virgil' },
  ovid: { it: 'Ovidio', en: 'Ovid' },
  cicero: { it: 'Cicerone', en: 'Cicero' },
  plutarch: { it: 'Plutarco', en: 'Plutarch' },
  sophocles: { it: 'Sofocle', en: 'Sophocles' },
  hesiod: { it: 'Esiodo', en: 'Hesiod' },
  pindar: { it: 'Pindaro', en: 'Pindar' },
  leonardo: { it: 'Leonardo da Vinci', en: 'Leonardo da Vinci' },
  dante: { it: 'Dante Alighieri', en: 'Dante Alighieri' },
  emerson: { it: 'Ralph Waldo Emerson', en: 'Ralph Waldo Emerson' },
  thoreau: { it: 'Henry David Thoreau', en: 'Henry David Thoreau' },
  kierkegaard: { it: 'Søren Kierkegaard', en: 'Søren Kierkegaard' },
  juvenal: { it: 'Giovenale', en: 'Juvenal' },
  terence: { it: 'Terenzio', en: 'Terence' },
  shakespeare: { it: 'William Shakespeare', en: 'William Shakespeare' },
} satisfies Record<string, Pair>

const WORKS = {
  lucilius: { it: 'Lettere a Lucilio', en: 'Letters to Lucilius' },
  brevity: { it: 'La brevità della vita', en: 'On the Shortness of Life' },
  providence: { it: 'La provvidenza', en: 'On Providence' },
  anger: { it: "L'ira", en: 'On Anger' },
  tranquillity: {
    it: "La tranquillità dell'animo",
    en: 'On Tranquillity of Mind',
  },
  hercules: { it: 'Ercole furioso', en: 'Hercules Furens' },
  meditations: { it: 'Pensieri', en: 'Meditations' },
  discourses: { it: 'Diatribe', en: 'Discourses' },
  enchiridion: { it: 'Manuale', en: 'Enchiridion' },
  fragments: { it: 'Frammenti', en: 'Fragments' },
  ethics: { it: 'Etica Nicomachea', en: 'Nicomachean Ethics' },
  politics: { it: 'Politica', en: 'Politics' },
  laertius: {
    it: 'in Diogene Laerzio, Vite dei filosofi',
    en: 'in Diogenes Laertius, Lives of the Philosophers',
  },
  laws: { it: 'Leggi', en: 'Laws' },
  memorabilia: {
    it: 'in Senofonte, Memorabili',
    en: 'in Xenophon, Memorabilia',
  },
  tao: { it: 'Tao Te Ching', en: 'Tao Te Ching' },
  analects: { it: 'Dialoghi', en: 'Analects' },
  twilight: { it: 'Crepuscolo degli idoli', en: 'Twilight of the Idols' },
  zarathustra: {
    it: 'Così parlò Zarathustra',
    en: 'Thus Spoke Zarathustra',
  },
  wanderjahre: {
    it: 'Gli anni di pellegrinaggio di Wilhelm Meister',
    en: "Wilhelm Meister's Journeyman Years",
  },
  tasso: { it: 'Torquato Tasso', en: 'Torquato Tasso' },
  essays: { it: 'Saggi', en: 'Essays' },
  sentences: { it: 'Sentenze', en: 'Sentences' },
  odes: { it: 'Odi', en: 'Odes' },
  epistles: { it: 'Epistole', en: 'Epistles' },
  satires: { it: 'Satire', en: 'Satires' },
  aeneid: { it: 'Eneide', en: 'Aeneid' },
  georgics: { it: 'Georgiche', en: 'Georgics' },
  pontus: { it: 'Epistole dal Ponto', en: 'Letters from Pontus' },
  amores: { it: 'Amori', en: 'Amores' },
  artOfLove: { it: "L'arte di amare", en: 'The Art of Love' },
  oldAge: { it: 'La vecchiaia', en: 'On Old Age' },
  ends: { it: 'Il sommo bene', en: 'On Ends' },
  duties: { it: 'I doveri', en: 'On Duties' },
  listening: { it: "L'arte di ascoltare", en: 'On Listening' },
  electra: { it: 'Elettra', en: 'Electra' },
  worksDays: { it: 'Le opere e i giorni', en: 'Works and Days' },
  pythian: { it: 'Pitiche', en: 'Pythian Odes' },
  atlanticus: { it: 'Codice Atlantico', en: 'Codex Atlanticus' },
  inferno: { it: 'Inferno', en: 'Inferno' },
  circles: { it: 'Cerchi', en: 'Circles' },
  journal: { it: 'Diario', en: 'Journal' },
  letterLund: {
    it: 'Lettera a Henriette Lund',
    en: 'Letter to Henriette Lund',
  },
  selfTormentor: {
    it: 'Il punitore di se stesso',
    en: 'The Self-Tormentor',
  },
  measure: { it: 'Misura per misura', en: 'Measure for Measure' },
} satisfies Record<string, Pair>

interface QuoteEntry {
  a: keyof typeof AUTHORS
  w: keyof typeof WORKS
  /** Libro, capitolo o verso (facoltativo). */
  ref?: string
  it: string
  en: string
}

// prettier-ignore
const QUOTES: QuoteEntry[] = [
  // ---------- Seneca ----------
  { a: 'seneca', w: 'lucilius', ref: '13', it: 'Soffriamo più spesso nell’immaginazione che nella realtà.', en: 'We suffer more often in imagination than in reality.' },
  { a: 'seneca', w: 'lucilius', ref: '13', it: 'Sono più le cose che ci spaventano di quelle che ci schiacciano.', en: 'There are more things likely to frighten us than to crush us.' },
  { a: 'seneca', w: 'lucilius', ref: '104', it: 'Non è perché le cose sono difficili che non osiamo; è perché non osiamo che sono difficili.', en: 'It is not because things are difficult that we do not dare; it is because we do not dare that they are difficult.' },
  { a: 'seneca', w: 'lucilius', ref: '71', it: 'Nessun vento è favorevole per chi non sa in quale porto vuole andare.', en: 'If one does not know to which port one is sailing, no wind is favourable.' },
  { a: 'seneca', w: 'lucilius', ref: '1', it: 'Mentre si rimanda, la vita passa.', en: 'While we put things off, life speeds by.' },
  { a: 'seneca', w: 'lucilius', ref: '1', it: 'Afferra ogni ora.', en: 'Hold every hour in your grasp.' },
  { a: 'seneca', w: 'lucilius', ref: '101', it: 'Comincia subito a vivere.', en: 'Begin at once to live.' },
  { a: 'seneca', w: 'lucilius', ref: '7', it: 'Frequenta chi può renderti migliore.', en: 'Associate with those who will make a better person of you.' },
  { a: 'seneca', w: 'lucilius', ref: '8', it: 'Il corpo va trattato con una certa durezza, perché non disobbedisca all’animo.', en: 'The body should be treated rigorously, so that it does not disobey the mind.' },
  { a: 'seneca', w: 'lucilius', ref: '81', it: 'Anche dopo un cattivo raccolto bisogna seminare.', en: 'Even after a bad harvest, there must be sowing.' },
  { a: 'seneca', w: 'lucilius', ref: '76', it: 'Finché vivi, continua a imparare come si vive.', en: 'As long as you live, keep learning how to live.' },
  { a: 'seneca', w: 'lucilius', ref: '76', it: 'Nessuno è diventato saggio per caso.', en: 'No one has ever become wise by chance.' },
  { a: 'seneca', w: 'lucilius', ref: '123', it: 'Finché non cominciamo a farne a meno, non capiamo quante cose siano superflue.', en: 'Until we have begun to go without them, we fail to realise how unnecessary many things are.' },
  { a: 'seneca', w: 'lucilius', ref: '90', it: 'Il più potente è chi ha se stesso in proprio potere.', en: 'Most powerful is the one who has himself in his own power.' },
  { a: 'seneca', w: 'lucilius', ref: '30', it: 'Un grande timoniere naviga anche con la vela strappata.', en: 'A great pilot can sail even when his canvas is torn.' },
  { a: 'seneca', w: 'lucilius', ref: '78', it: 'Il dolore è lieve, se l’opinione non vi aggiunge nulla.', en: 'Pain is slight if opinion has added nothing to it.' },
  { a: 'seneca', w: 'lucilius', ref: '2', it: 'Una pianta spostata di continuo non mette radici forti.', en: 'A plant which is often moved cannot grow strong.' },
  { a: 'seneca', w: 'lucilius', ref: '15', it: 'Scegli esercizi brevi e semplici, che stanchino presto il corpo e facciano risparmiare tempo.', en: 'Choose exercises that are short and simple, that tire the body quickly and save time.' },
  { a: 'seneca', w: 'brevity', ref: '1', it: 'Non abbiamo poco tempo: ne perdiamo molto.', en: 'It is not that we have a short time to live, but that we waste a lot of it.' },
  { a: 'seneca', w: 'brevity', ref: '2', it: 'La vita è lunga, se sai usarla.', en: 'Life is long if you know how to use it.' },
  { a: 'seneca', w: 'brevity', ref: '9', it: 'Il più grande ostacolo al vivere è l’attesa, che dipende dal domani e perde l’oggi.', en: 'The greatest obstacle to living is expectancy, which hangs upon tomorrow and loses today.' },
  { a: 'seneca', w: 'providence', ref: '5', it: 'Il fuoco mette alla prova l’oro, le difficoltà gli uomini forti.', en: 'Fire tests gold, and hardship tests brave men.' },
  { a: 'seneca', w: 'providence', ref: '3', it: 'Nessuno mi sembra più sfortunato di chi non ha mai incontrato un’avversità.', en: 'No one seems to me more unfortunate than the one who has never met with adversity.' },
  { a: 'seneca', w: 'anger', ref: '2, 12', it: 'Non c’è nulla di così difficile e arduo che la mente umana non possa vincere.', en: 'Nothing is so hard and arduous that the human mind cannot conquer it.' },
  { a: 'seneca', w: 'tranquillity', ref: '17', it: 'Alla mente va concesso riposo: riposata, si alza migliore e più acuta.', en: 'The mind must be given rest: it rises better and keener after resting.' },
  { a: 'seneca', w: 'hercules', it: 'Ciò che fu duro sopportare è dolce ricordare.', en: 'What was hard to endure is sweet to remember.' },
  { a: 'seneca', w: 'hercules', it: 'Non c’è una via facile dalla terra alle stelle.', en: 'There is no easy way from the earth to the stars.' },

  // ---------- Marco Aurelio ----------
  { a: 'marcus', w: 'meditations', ref: '5, 20', it: 'L’impedimento all’azione fa avanzare l’azione. Ciò che ostacola la via diventa la via.', en: 'The impediment to action advances action. What stands in the way becomes the way.' },
  { a: 'marcus', w: 'meditations', ref: '10, 16', it: 'Smetti di discutere su come debba essere un uomo buono: siilo.', en: 'Waste no more time arguing about what a good man should be. Be one.' },
  { a: 'marcus', w: 'meditations', ref: '5, 16', it: 'Come sono i tuoi pensieri abituali, così sarà la tua mente.', en: 'Such as are your habitual thoughts, such also will be the character of your mind.' },
  { a: 'marcus', w: 'meditations', ref: '5, 1', it: 'Al mattino, quando fai fatica ad alzarti, pensa: mi alzo per fare il lavoro di un essere umano.', en: 'At dawn, when you struggle to get out of bed, tell yourself: I am rising to do the work of a human being.' },
  { a: 'marcus', w: 'meditations', ref: '12, 17', it: 'Se non è giusto, non farlo; se non è vero, non dirlo.', en: 'If it is not right, do not do it; if it is not true, do not say it.' },
  { a: 'marcus', w: 'meditations', ref: '7, 29', it: 'Limitati al presente.', en: 'Confine yourself to the present.' },
  { a: 'marcus', w: 'meditations', ref: '7, 61', it: 'L’arte di vivere somiglia più alla lotta che alla danza.', en: 'The art of living is more like wrestling than dancing.' },
  { a: 'marcus', w: 'meditations', ref: '4, 17', it: 'Non vivere come se avessi davanti diecimila anni.', en: 'Do not act as if you had ten thousand years to live.' },
  { a: 'marcus', w: 'meditations', ref: '4, 49', it: 'Sii come il promontorio contro cui si infrangono le onde: resta saldo, e intorno a lui l’acqua si placa.', en: 'Be like the headland against which the waves keep breaking: it stands firm, and the water around it is calmed.' },
  { a: 'marcus', w: 'meditations', ref: '7, 67', it: 'Per vivere felici serve pochissimo.', en: 'Very little is needed to make a happy life.' },
  { a: 'marcus', w: 'meditations', ref: '2, 5', it: 'Compi ogni azione come se fosse l’ultima della tua vita.', en: 'Do every act of your life as though it were the very last.' },
  { a: 'marcus', w: 'meditations', ref: '6, 19', it: 'Se una cosa è difficile per te, non pensare che sia impossibile; se è possibile per un uomo, è alla tua portata.', en: 'If something is hard for you, do not think it impossible; if it is possible for a human being, it is within your reach.' },
  { a: 'marcus', w: 'meditations', ref: '7, 59', it: 'Guarda dentro di te: dentro c’è la sorgente del bene.', en: 'Look within. Within is the fountain of good.' },
  { a: 'marcus', w: 'meditations', ref: '8, 47', it: 'Se qualcosa di esterno ti turba, non è la cosa a farti male ma il tuo giudizio su di essa; e quello puoi cambiarlo subito.', en: 'If you are distressed by anything external, the pain is not due to the thing itself but to your judgement of it, and that you can change at once.' },
  { a: 'marcus', w: 'meditations', ref: '9, 35', it: 'Perdere non è altro che cambiare.', en: 'Loss is nothing else but change.' },
  { a: 'marcus', w: 'meditations', ref: '4, 24', it: 'Fai poche cose, se vuoi essere sereno.', en: 'Do few things, if you would be tranquil.' },

  // ---------- Epitteto ----------
  { a: 'epictetus', w: 'discourses', ref: '1, 15', it: 'Nessuna grande cosa nasce all’improvviso.', en: 'No great thing is created suddenly.' },
  { a: 'epictetus', w: 'discourses', ref: '1, 24', it: 'Sono le difficoltà a mostrare chi sono gli uomini.', en: 'It is difficulties that show what men are.' },
  { a: 'epictetus', w: 'discourses', ref: '3, 23', it: 'Prima di’ a te stesso chi vuoi essere; poi fa’ ciò che devi fare.', en: 'First say to yourself what you would be; then do what you have to do.' },
  { a: 'epictetus', w: 'discourses', ref: '2, 18', it: 'Ogni abitudine si conserva e cresce con le azioni corrispondenti: il camminare camminando, il correre correndo.', en: 'Every habit and faculty is preserved and increased by corresponding actions: walking by walking, running by running.' },
  { a: 'epictetus', w: 'discourses', ref: '1, 1', it: 'Fai il miglior uso di ciò che dipende da te, e prendi il resto come viene.', en: 'Make the best of what is in your power, and take the rest as it comes.' },
  { a: 'epictetus', w: 'enchiridion', ref: '5', it: 'Non sono le cose a turbare gli uomini, ma i giudizi che danno delle cose.', en: 'Men are disturbed not by things, but by the judgements they form about things.' },
  { a: 'epictetus', w: 'enchiridion', ref: '13', it: 'Se vuoi progredire, accetta di sembrare sciocco.', en: 'If you want to improve, be content to be thought foolish.' },
  { a: 'epictetus', w: 'enchiridion', ref: '29', it: 'Vuoi vincere a Olimpia? Allora devi seguire una disciplina, allenarti all’ora stabilita, col caldo e col freddo.', en: 'You want to win at Olympia? Then you must follow a discipline and train at the set hour, in heat and in cold.' },
  { a: 'epictetus', w: 'enchiridion', ref: '46', it: 'Non parlare dei tuoi principi: mettili in pratica.', en: 'Do not talk about your principles; act on them.' },
  { a: 'epictetus', w: 'enchiridion', ref: '8', it: 'Non chiedere che le cose vadano come vuoi, ma vogli che vadano come vanno: e vivrai sereno.', en: 'Do not seek for things to happen as you wish, but wish them to happen as they do, and your life will flow well.' },
  { a: 'epictetus', w: 'fragments', it: 'Saggio è chi non si rattrista per ciò che non ha, ma gioisce di ciò che ha.', en: 'Wise is the one who does not grieve for what he has not, but rejoices in what he has.' },

  // ---------- Musonio Rufo ----------
  { a: 'musonius', w: 'fragments', it: 'Se fai qualcosa di buono con fatica, la fatica passa e il bene resta.', en: 'If you do something good with toil, the toil passes but the good remains.' },

  // ---------- Aristotele ----------
  { a: 'aristotle', w: 'ethics', ref: 'II, 1', it: 'Le cose che bisogna imparare prima di farle, le impariamo facendole.', en: 'The things we have to learn before we can do them, we learn by doing them.' },
  { a: 'aristotle', w: 'ethics', ref: 'II, 1', it: 'Diventiamo giusti compiendo azioni giuste, coraggiosi compiendo azioni coraggiose.', en: 'We become just by doing just acts, and brave by doing brave acts.' },
  { a: 'aristotle', w: 'ethics', ref: 'I, 7', it: 'Una rondine non fa primavera, né la fa un solo giorno.', en: 'One swallow does not make a spring, nor does one day.' },
  { a: 'aristotle', w: 'politics', ref: 'V, 4', it: 'Il principio è la metà del tutto.', en: 'The beginning is half of the whole.' },
  { a: 'aristotle', w: 'laertius', ref: 'V, 18', it: 'Le radici dell’educazione sono amare, ma i frutti sono dolci.', en: 'The roots of education are bitter, but the fruit is sweet.' },

  // ---------- Eraclito, Platone, Socrate ----------
  { a: 'heraclitus', w: 'fragments', ref: 'DK 91', it: 'Non si può scendere due volte nello stesso fiume.', en: 'You cannot step twice into the same river.' },
  { a: 'heraclitus', w: 'fragments', ref: 'DK 119', it: 'Il carattere di un uomo è il suo destino.', en: 'A man’s character is his destiny.' },
  { a: 'plato', w: 'laws', ref: 'I, 626e', it: 'Vincere se stessi è la prima e la migliore delle vittorie.', en: 'To conquer oneself is the first and best of all victories.' },
  { a: 'socrates', w: 'memorabilia', ref: 'III, 12', it: 'È una vergogna invecchiare per trascuratezza, senza aver visto quanto forte e bello può diventare il proprio corpo.', en: 'It is a disgrace to grow old through carelessness before seeing how strong and beautiful your body can become.' },

  // ---------- Laozi, Confucio ----------
  { a: 'laozi', w: 'tao', ref: '64', it: 'Un viaggio di mille miglia comincia con un passo.', en: 'A journey of a thousand miles begins with a single step.' },
  { a: 'laozi', w: 'tao', ref: '64', it: 'L’albero che riempie un abbraccio nasce da un germoglio sottile.', en: 'A tree as wide as an embrace grows from a tiny shoot.' },
  { a: 'laozi', w: 'tao', ref: '33', it: 'Chi vince gli altri è forte; chi vince se stesso è potente.', en: 'One who conquers others is strong; one who conquers himself is mighty.' },
  { a: 'laozi', w: 'tao', ref: '33', it: 'Conoscere gli altri è intelligenza; conoscere se stessi è saggezza.', en: 'Knowing others is intelligence; knowing yourself is wisdom.' },
  { a: 'laozi', w: 'tao', ref: '78', it: 'Nulla è più morbido dell’acqua, eppure nulla la supera nel vincere ciò che è duro.', en: 'Nothing is softer than water, yet nothing surpasses it in overcoming the hard.' },
  { a: 'laozi', w: 'tao', ref: '76', it: 'Ciò che è rigido si spezza; ciò che è flessibile prevale.', en: 'The stiff and unbending will break; the soft and supple will prevail.' },
  { a: 'confucius', w: 'analects', ref: '1, 1', it: 'Non è un piacere imparare e mettere in pratica, al momento giusto, ciò che si è imparato?', en: 'Is it not a pleasure to learn and, in due time, to practise what you have learned?' },
  { a: 'confucius', w: 'analects', ref: '2, 15', it: 'Imparare senza riflettere è fatica sprecata; riflettere senza imparare è pericoloso.', en: 'Learning without thought is labour lost; thought without learning is perilous.' },
  { a: 'confucius', w: 'analects', ref: '1, 8', it: 'Quando sbagli, non aver paura di correggerti.', en: 'When you have faults, do not fear to correct them.' },
  { a: 'confucius', w: 'analects', ref: '2, 24', it: 'Vedere ciò che è giusto e non farlo è mancanza di coraggio.', en: 'To see what is right and not do it is a lack of courage.' },

  // ---------- Nietzsche, Goethe, Montaigne ----------
  { a: 'nietzsche', w: 'twilight', it: 'Ciò che non mi uccide mi rende più forte.', en: 'What does not kill me makes me stronger.' },
  { a: 'nietzsche', w: 'twilight', it: 'Chi ha un perché per vivere sopporta quasi ogni come.', en: 'One who has a why to live can bear almost any how.' },
  { a: 'nietzsche', w: 'twilight', it: 'Solo i pensieri che vengono camminando hanno valore.', en: 'Only thoughts that come from walking have any value.' },
  { a: 'nietzsche', w: 'zarathustra', it: 'Bisogna avere ancora un caos dentro di sé per partorire una stella danzante.', en: 'One must still have chaos within oneself to give birth to a dancing star.' },
  { a: 'goethe', w: 'wanderjahre', it: 'Non basta sapere, bisogna applicare; non basta volere, bisogna fare.', en: 'Knowing is not enough; we must apply. Willing is not enough; we must do.' },
  { a: 'goethe', w: 'tasso', ref: 'I, 2', it: 'Il talento si forma nella quiete, il carattere nella corrente del mondo.', en: 'Talent is formed in stillness, character in the stream of the world.' },
  { a: 'montaigne', w: 'essays', ref: 'III, 13', it: 'Chi teme di soffrire soffre già di ciò che teme.', en: 'One who fears suffering already suffers from what he fears.' },

  // ---------- Publilio Siro ----------
  { a: 'syrus', w: 'sentences', it: 'La pratica è il migliore dei maestri.', en: 'Practice is the best of all teachers.' },
  { a: 'syrus', w: 'sentences', it: 'Con il mare calmo chiunque sa tenere il timone.', en: 'Anyone can hold the helm when the sea is calm.' },
  { a: 'syrus', w: 'sentences', it: 'Non tornare indietro quando sei vicino al traguardo.', en: 'Do not turn back when you are near the goal.' },
  { a: 'syrus', w: 'sentences', it: 'La pazienza è il rimedio di ogni dolore.', en: 'Patience is the remedy for every sorrow.' },
  { a: 'syrus', w: 'sentences', it: 'I fiumi si attraversano più facilmente vicino alla sorgente.', en: 'Rivers are easiest to cross at their source.' },
  { a: 'syrus', w: 'sentences', it: 'È un cattivo piano quello che non si può cambiare.', en: 'It is a bad plan that cannot be changed.' },

  // ---------- Orazio, Virgilio, Ovidio ----------
  { a: 'horace', w: 'odes', ref: 'I, 11', it: 'Cogli l’attimo, confidando il meno possibile nel domani.', en: 'Seize the day, trusting as little as possible in tomorrow.' },
  { a: 'horace', w: 'odes', ref: 'II, 3', it: 'Ricordati di conservare la mente serena nei momenti difficili.', en: 'Remember to keep a calm mind in difficult times.' },
  { a: 'horace', w: 'epistles', ref: 'I, 2', it: 'Chi ha cominciato è a metà dell’opera. Abbi il coraggio di essere saggio: comincia!', en: 'Well begun is half done. Dare to be wise: begin!' },
  { a: 'horace', w: 'satires', ref: 'II, 8', it: 'Le avversità rivelano il talento, la buona sorte lo nasconde.', en: 'Adversity reveals talent; good fortune hides it.' },
  { a: 'virgil', w: 'aeneid', ref: 'V, 231', it: 'Possono, perché credono di potere.', en: 'They can, because they think they can.' },
  { a: 'virgil', w: 'aeneid', ref: 'X, 284', it: 'La fortuna aiuta gli audaci.', en: 'Fortune favours the bold.' },
  { a: 'virgil', w: 'aeneid', ref: 'I, 203', it: 'Forse un giorno ci farà piacere ricordare anche questo.', en: 'Perhaps one day it will be a joy to remember even this.' },
  { a: 'virgil', w: 'georgics', ref: 'I, 145', it: 'La fatica ostinata vince ogni cosa.', en: 'Relentless toil conquers all.' },
  { a: 'ovid', w: 'pontus', ref: 'IV, 10', it: 'La goccia scava la pietra.', en: 'Dripping water hollows out the stone.' },
  { a: 'ovid', w: 'amores', ref: 'III, 11', it: 'Resisti e sii forte: un giorno questo dolore ti sarà utile.', en: 'Be patient and endure: one day this pain will be useful to you.' },
  { a: 'ovid', w: 'artOfLove', ref: 'II, 351', it: 'Concediti riposo: il campo che ha riposato rende un raccolto abbondante.', en: 'Take rest: a field that has rested gives a bountiful crop.' },

  // ---------- Cicerone, Plutarco ----------
  { a: 'cicero', w: 'oldAge', it: 'L’esercizio e la moderazione conservano qualcosa della forza di un tempo anche nella vecchiaia.', en: 'Exercise and moderation can preserve something of our former strength even in old age.' },
  { a: 'cicero', w: 'ends', it: 'Gli inizi di tutte le cose sono piccoli.', en: 'The beginnings of all things are small.' },
  { a: 'cicero', w: 'duties', it: 'In ogni impresa, prima di cominciare, serve una preparazione accurata.', en: 'In every undertaking, careful preparation is needed before you begin.' },
  { a: 'plutarch', w: 'listening', it: 'La mente non è un vaso da riempire, ma un fuoco da accendere.', en: 'The mind is not a vessel to be filled, but a fire to be kindled.' },

  // ---------- Greci ----------
  { a: 'sophocles', w: 'electra', it: 'Senza fatica nulla riesce.', en: 'Without toil nothing succeeds.' },
  { a: 'hesiod', w: 'worksDays', ref: '289', it: 'Davanti al valore gli dèi hanno posto il sudore.', en: 'Before excellence the gods have placed sweat.' },
  { a: 'pindar', w: 'pythian', ref: 'II', it: 'Diventa ciò che sei, dopo averlo imparato.', en: 'Become who you are, having learned what that is.' },

  // ---------- Moderni ----------
  { a: 'leonardo', w: 'atlanticus', it: 'Il ferro si arrugginisce se non si adopera: così l’ingegno senza esercizio si guasta.', en: 'Iron rusts from disuse: so too the mind spoils without exercise.' },
  { a: 'dante', w: 'inferno', ref: 'XXVI, 119–120', it: 'Fatti non foste a viver come bruti, ma per seguir virtute e canoscenza.', en: 'You were not made to live like brutes, but to follow virtue and knowledge.' },
  { a: 'emerson', w: 'circles', it: 'Nulla di grande è mai stato compiuto senza entusiasmo.', en: 'Nothing great was ever achieved without enthusiasm.' },
  { a: 'thoreau', w: 'journal', it: 'Appena le mie gambe cominciano a muoversi, i miei pensieri cominciano a scorrere.', en: 'The moment my legs begin to move, my thoughts begin to flow.' },
  { a: 'kierkegaard', w: 'letterLund', it: 'Soprattutto, non perdere la voglia di camminare.', en: 'Above all, do not lose your desire to walk.' },
  { a: 'juvenal', w: 'satires', ref: 'X, 356', it: 'Mente sana in corpo sano.', en: 'A sound mind in a sound body.' },
  { a: 'terence', w: 'selfTormentor', it: 'Nulla è così difficile che non si possa scoprire cercando.', en: 'Nothing is so difficult that it cannot be found out by seeking.' },
  { a: 'shakespeare', w: 'measure', ref: 'I, 4', it: 'I nostri dubbi sono traditori: ci fanno perdere il bene che potremmo ottenere, per paura di tentare.', en: 'Our doubts are traitors, and make us lose the good we oft might win by fearing to attempt.' },
]

export interface Quote {
  text: string
  author: string
  /** Opera, con libro o capitolo se noti. */
  source: string
}

export const QUOTE_COUNT = QUOTES.length

/** La citazione numero `index` (modulo il totale) nella lingua scelta. */
export function quoteAt(index: number, lang: 'it' | 'en'): Quote {
  const n = QUOTES.length
  const q = QUOTES[((index % n) + n) % n]
  const work = WORKS[q.w][lang]
  return {
    text: q[lang],
    author: AUTHORS[q.a][lang],
    source: q.ref ? `${work}, ${q.ref}` : work,
  }
}
