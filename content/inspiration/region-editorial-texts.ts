import type { RegionEditorialTexts } from "@/types/inspiration";

/**
 * Textes éditoriaux par région (26 zones carte).
 * Source : brief rédactionnel inspiration (ton magazine, sans chiffres inventés).
 */
export const REGION_EDITORIAL_TEXTS: Record<string, RegionEditorialTexts> = {
  bretagne: {
    accroche_carte: "Falaises, embruns, ports de granit et terres de légendes.",
    paragraphe_explorer:
      "Une région de caps, d’îles, de cités de caractère et de chemins côtiers, à parcourir entre lumière changeante, villages de granit et longues échappées face à l’Atlantique.",
    trois_incontournables: ["Saint-Malo", "Presqu’île de Crozon", "Forêt de Brocéliande"],
    note_terrain:
      "La Bretagne se savoure autant sur ses rivages que dans son intérieur plus secret, entre vallons, canaux, forêts et bourgs de pierre.",
    intro_longue:
      "La Bretagne a le goût du large, des bourrasques franches et des éclaircies soudaines qui redessinent un port en quelques minutes. On y passe des remparts battus par la mer aux petits ports nichés dans les abers, des longues plages du nord aux pointes rocheuses du Finistère.",
    ambiance_detail:
      "Mais réduire la Bretagne à sa côte serait passer à côté d’un autre voyage : celui des canaux, des chapelles, des villages de granite et des forêts habitées par les récits. C’est une région qui se prête aussi bien aux grandes traversées qu’aux séjours plus lents, à base de marchés, de sentiers et de détours.",
    photo_hero_suggestion: "grande côte, port ou paysage signature",
    photo_slots: {
      hero: "1 photo horizontale forte",
      carousel_intro: "3 à 5 photos d’ambiance",
      carousel_incontournables: "1 photo par incontournable",
    },
  },
  normandie: {
    accroche_carte: "Falaises blanches, bocages profonds et grandes marées de mémoire.",
    paragraphe_explorer:
      "Entre rivages spectaculaires, ports élégants, campagne paisible et villes chargées d’histoire, la Normandie compose un voyage dense, changeant et très facile à aimer.",
    trois_incontournables: ["Mont-Saint-Michel", "Étretat", "Honfleur"],
    note_terrain:
      "La Normandie fonctionne très bien en séquences contrastées : littoral, campagne, patrimoine et petites villes s’enchaînent sans effort.",
    intro_longue:
      "La Normandie alterne les lignes nettes des falaises, les vastes plages ouvertes au vent et les campagnes plus feutrées où les haies, les pommiers et les villages semblent ralentir le temps. C’est une région où l’eau est partout : dans les ports, les estuaires, les marais et la lumière.",
    ambiance_detail:
      "On y passe facilement d’une promenade sur les planches à un détour par une abbaye, d’un port de pêche à une station élégante, d’un vallon du bocage à une grande plage historique. La richesse du patrimoine y donne une colonne vertébrale forte, mais c’est l’atmosphère générale, douce et ample, qui marque durablement.",
  },
  "picardie-flandre": {
    accroche_carte: "Beffrois, longues plages du nord et plaines traversées de lumière.",
    paragraphe_explorer:
      "Une région de villes puissantes, de mémoire, de cathédrales, de dunes et d’horizons très ouverts, où le nord se révèle plus subtil, plus sensible et plus varié qu’on ne l’imagine.",
    trois_incontournables: ["Lille", "Baie de Somme", "Amiens"],
    note_terrain:
      "Le contraste entre les grandes villes du nord, les plaines, les villages de brique et les espaces littoraux fait tout l’intérêt du parcours.",
    intro_longue:
      "Picardie et Flandre avancent avec franchise : beffrois, façades de brique, centres anciens très vivants, grandes places et patrimoine monumental. Mais la région sait aussi se faire plus douce, dans les canaux, les marais, les dunes et les villages de l’arrière-pays.",
    ambiance_detail:
      "Le voyage y prend souvent la forme d’un va-et-vient entre puissance urbaine et grands espaces. Les villes donnent le rythme, la côte ouvre le regard, et l’intérieur déroule une géographie plus silencieuse de plaines, de champs, d’eau et de mémoire.",
  },
  champagne: {
    accroche_carte: "Coteaux calmes, villes de sacre et villages entre vignes.",
    paragraphe_explorer:
      "Une région où l’élégance tient autant aux caves et aux coteaux qu’aux cathédrales, aux lacs, aux forêts et aux petites routes qui ondulent entre les rangs de vigne.",
    trois_incontournables: ["Reims", "Épernay", "Troyes"],
    note_terrain:
      "La Champagne gagne à être abordée lentement, en alternant patrimoine urbain, villages viticoles et routes plus buissonnières.",
    intro_longue:
      "La Champagne n’est pas qu’une affaire de flûtes et de caves. C’est un paysage de pentes modestes, de villages ordonnés, de forêts discrètes et de villes au passé considérable. Les lignes y sont douces, les routes paisibles, les horizons largement ouverts.",
    ambiance_detail:
      "Reims apporte la solennité, Troyes le charme plus serré des ruelles et pans de bois, tandis qu’autour, les coteaux dessinent un territoire à parcourir presque à voix basse. C’est une région de nuances, de lumière claire et d’étapes courtes.",
  },
  lorraine: {
    accroche_carte: "Étangs, forêts profondes et villes de pierre au passé dense.",
    paragraphe_explorer:
      "Entre places majestueuses, vallées industrielles reconverties, massifs boisés et lacs paisibles, la Lorraine déploie un visage plus ample et plus sensible qu’attendu.",
    trois_incontournables: ["Nancy", "Metz", "Vosges du Nord et du Sud lorrain"],
    note_terrain:
      "La Lorraine se lit bien dans ses contrastes : grandes villes raffinées, paysages d’eau, forêts épaisses et reliefs plus doux vers l’est.",
    intro_longue:
      "La Lorraine a quelque chose de retenu, presque feutré, qui se révèle à mesure qu’on la traverse. Les centres anciens y sont solides, les places vastes, les pierres blondes ou grises, et les paysages alternent entre étangs, forêts et vallées.",
    ambiance_detail:
      "On y trouve à la fois une vraie intensité patrimoniale et une respiration naturelle continue. C’est une région où l’on peut passer d’un musée à un lac, d’une cathédrale à une route forestière, sans rupture brutale.",
  },
  alsace: {
    accroche_carte: "Villages fleuris, vignes en lisière et crêtes vosgiennes au loin.",
    paragraphe_explorer:
      "L’Alsace assemble avec une facilité rare les villages de carte postale, les villes brillantes, les caves, les forêts et les cols, dans un décor très lisible et très séduisant.",
    trois_incontournables: ["Strasbourg", "Colmar", "Route des vins d’Alsace"],
    note_terrain:
      "C’est une région idéale pour un voyage très rythmé : patrimoine, villages, vignobles et échappées vers les Vosges s’y enchaînent naturellement.",
    intro_longue:
      "L’Alsace est immédiatement identifiable : colombages, clochers effilés, alignements de vignes, villages impeccablement posés au pied des Vosges. Pourtant, au-delà de cette évidence visuelle, la région offre une réelle profondeur, entre grandes villes, châteaux en hauteur et forêts denses.",
    ambiance_detail:
      "Le voyage y est fluide, presque chorégraphié. On passe d’un marché en ville à une cave, d’une ruelle fleurie à une route de montagne. Tout semble proche, mais jamais monotone.",
  },
  "franche-comte": {
    accroche_carte: "Reculées, rivières claires et villes discrètes entre forêts et pierre.",
    paragraphe_explorer:
      "Une région de vallées secrètes, de plateaux, de villages sobres et de nature très présente, parfaite pour qui cherche un voyage plus silencieux, plus frais et plus ancré.",
    trois_incontournables: ["Besançon", "Cascade des Tufs et Baume-les-Messieurs", "Lac de Saint-Point"],
    note_terrain:
      "La Franche-Comté se découvre par enchaînement de reliefs doux, de reculées et de petites villes, avec un vrai sentiment d’espace.",
    intro_longue:
      "La Franche-Comté ne cherche pas à séduire trop vite, et c’est précisément ce qui la rend attachante. Les reliefs y ondulent sans brutalité, les forêts s’étendent, les rivières entaillent la pierre, et les villages apparaissent souvent à la faveur d’un virage.",
    ambiance_detail:
      "C’est une terre de fraîcheur, de plateaux, d’eau vive et de patrimoine moins ostentatoire. Le voyage y prend une allure plus intérieure, entre fortifications, cascades, lacs et routes tranquilles.",
  },
  bourgogne: {
    accroche_carte: "Vignes, abbayes, canaux et villages à la douceur bien tenue.",
    paragraphe_explorer:
      "La Bourgogne marie les grands vins, la pierre romane, les petites villes élégantes et les routes calmes, dans une géographie qui invite à prendre son temps.",
    trois_incontournables: ["Beaune", "Vézelay", "Abbaye de Fontenay"],
    note_terrain:
      "La région fonctionne très bien en voyage lent, avec des étapes courtes entre patrimoine, paysages viticoles et tables généreuses.",
    intro_longue:
      "La Bourgogne déploie une forme de plénitude : collines sages, vignes tirées au cordeau, villages de pierre claire, anciennes abbayes et villes à taille humaine. Tout semble y appeler la lenteur, la promenade et le détour.",
    ambiance_detail:
      "Au-delà des grands noms du vin, la région offre un patrimoine exceptionnel et une vraie cohérence de paysage. C’est un territoire à savourer par fragments : un clocher, une cave, un canal, une place, une route bordée de murets.",
  },
  "ile-de-france": {
    accroche_carte: "Au-delà de Paris, palais, forêts, villages et bords de rivière.",
    paragraphe_explorer:
      "L’Île-de-France ne se résume pas à la capitale : châteaux, forêts profondes, cités royales, villages de peintres et vallées tranquilles composent un territoire bien plus varié qu’on ne croit.",
    trois_incontournables: ["Paris", "Versailles", "Fontainebleau"],
    note_terrain:
      "Le cœur urbain y est immense, mais il faut aussi regarder les lisières, les forêts et les villes historiques qui dessinent un autre visage de la région.",
    intro_longue:
      "L’Île-de-France est souvent abordée par son centre, son rythme et sa densité. Pourtant, dès qu’on s’éloigne un peu, le territoire s’ouvre autrement : grandes forêts, châteaux, vallées, bords de Seine ou de Marne, villages d’artistes et cités anciennes.",
    ambiance_detail:
      "Le contraste est la clé de lecture la plus juste. D’un côté, la puissance urbaine et monumentale ; de l’autre, des respirations presque inattendues, très accessibles, qui donnent à la région une profondeur de voyage réelle.",
  },
  "val-loire-centre": {
    accroche_carte: "Châteaux, rivières lentes et jardins dans une lumière paisible.",
    paragraphe_explorer:
      "Le Val de Loire et le Centre enchaînent les grandes silhouettes de châteaux, les villes raffinées, les jardins et les bords de fleuve, dans une atmosphère ouverte et très douce.",
    trois_incontournables: ["Chambord", "Chenonceau", "Tours"],
    note_terrain:
      "C’est une région idéale pour alterner patrimoine spectaculaire, villages calmes et échappées à vélo ou au fil de l’eau.",
    intro_longue:
      "Ici, le paysage semble respirer plus largement. Les fleuves et rivières donnent le tempo, les châteaux scandent le parcours, les jardins ajoutent une douceur presque continue. Tout paraît organisé pour le regard, mais sans rigidité.",
    ambiance_detail:
      "Le voyage peut y être très classique, autour des grands monuments, ou plus intime, en suivant les routes secondaires, les quais, les villages et les lisières forestières. L’ensemble forme une région d’une grande lisibilité, très propice à l’inspiration.",
  },
  "angevin-maine": {
    accroche_carte: "Rivières tranquilles, cités de tuffeau et douceur de l’ouest.",
    paragraphe_explorer:
      "Entre vallées souples, petites villes élégantes, patrimoine monastique et campagne habitée, l’Anjou et le Maine offrent une France plus calme, plus subtile, mais jamais fade.",
    trois_incontournables: ["Angers", "Le Mans", "Saumur"],
    note_terrain:
      "C’est un territoire de transition très agréable, à parcourir sans précipitation, en alternant ville, rivière et campagne.",
    intro_longue:
      "L’Anjou et le Maine n’imposent rien, mais s’installent durablement. Les rivières y dessinent les trajets, les villes gardent une belle tenue patrimoniale, et les paysages s’étirent dans une douceur très régulière.",
    ambiance_detail:
      "On y vient pour une certaine qualité d’atmosphère : moins spectaculaire que d’autres régions, mais très plaisante à vivre. Le voyage s’y construit par nuances, entre remparts, jardins, vallées et vieilles pierres.",
  },
  "nantais-vendee": {
    accroche_carte: "Grand air atlantique, marais, plages et arrière-pays lumineux.",
    paragraphe_explorer:
      "Entre ville ouverte sur l’estuaire, longues plages, marais, îles et ports plus modestes, le Pays nantais et la Vendée dessinent une façade ouest simple, solaire et très accessible.",
    trois_incontournables: ["Nantes", "Noirmoutier", "Les Sables-d’Olonne"],
    note_terrain:
      "La région se lit bien entre deux tempos : l’énergie littorale d’un côté, la douceur des marais et de l’arrière-pays de l’autre.",
    intro_longue:
      "Le Pays nantais et la Vendée avancent avec une évidence tranquille : lumière de l’ouest, sable, pinèdes, estuaire, ports de plaisance, marais et longues routes plates. L’ensemble donne une impression de respiration continue.",
    ambiance_detail:
      "Mais le territoire ne se réduit pas à la plage. Nantes apporte une vraie densité culturelle, tandis que les îles, les marais et les bourgs vendéens offrent un voyage plus souple, entre eau, ciel et horizons dégagés.",
  },
  "poitou-saintonge": {
    accroche_carte: "Églises romanes, marais, îles et douceur blanche de l’ouest.",
    paragraphe_explorer:
      "Le Poitou et la Saintonge mêlent patrimoine roman, villes de pierre claire, littoral discret et campagnes apaisées, dans une ambiance lumineuse, souple et accueillante.",
    trois_incontournables: ["La Rochelle", "Île de Ré", "Poitiers"],
    note_terrain:
      "La façade maritime attire vite, mais l’intérieur mérite tout autant le détour pour ses villes, ses églises et ses paysages très ouverts.",
    intro_longue:
      "Le Poitou et la Saintonge ont cette lumière particulière des territoires tournés vers l’ouest : claire, calme, presque poudrée. Les villes y gardent une belle unité de pierre, les marais filtrent les horizons, et la mer n’est jamais très loin.",
    ambiance_detail:
      "Le voyage y glisse facilement entre patrimoine et littoral. On peut y chercher les ports, les îles et les plages, ou préférer les églises romanes, les petites routes et les marchés de villes anciennes plus tranquilles.",
  },
  limousin: {
    accroche_carte: "Plateaux, forêts, lacs et villages de pierre dans un calme rare.",
    paragraphe_explorer:
      "Le Limousin déroule une France plus intérieure, faite de collines, de forêts, de hameaux, de granit et de routes paisibles, idéale pour ralentir vraiment.",
    trois_incontournables: ["Limoges", "Collonges-la-Rouge", "Plateau de Millevaches"],
    note_terrain:
      "La région séduit par sa continuité : peu d’effets spectaculaires, mais un vrai sentiment d’espace, de fraîcheur et de cohérence paysagère.",
    intro_longue:
      "Le Limousin s’éprouve davantage qu’il ne s’exhibe. On y entre par des vallonnements modestes, des forêts, des villages au granit parfois sombre, parfois rouge, et des routes qui semblent toujours choisir le détour.",
    ambiance_detail:
      "C’est une région pour les voyageurs qui aiment les paysages habités, les lacs tranquilles, les bourgs simples et les atmosphères peu tapageuses. Elle offre une forme de repos sans jamais être vide.",
  },
  "perigord-quercy": {
    accroche_carte: "Villages suspendus, vallées calcaires et douceur gourmande du sud-ouest.",
    paragraphe_explorer:
      "Entre bastides, falaises, rivières, villages dorés et campagnes charnues, le Périgord et le Quercy composent un des grands voyages de pierre et de lumière du sud-ouest.",
    trois_incontournables: ["Sarlat-la-Canéda", "Rocamadour", "Saint-Cirq-Lapopie"],
    note_terrain:
      "La région se prête très bien aux boucles routières, avec une alternance constante entre villages, vallées, marchés et panoramas.",
    intro_longue:
      "Le Périgord et le Quercy donnent immédiatement envie de s’arrêter. Les pierres y prennent une belle chaleur, les villages s’accrochent à la pente ou au rebord d’un plateau, et les vallées guident naturellement le voyage.",
    ambiance_detail:
      "On y circule entre bastides, grottes, falaises, rivières tranquilles et marchés animés, avec cette impression fréquente que chaque détour débouche sur un nouveau belvédère ou une nouvelle silhouette de village.",
  },
  "gironde-landes": {
    accroche_carte: "Dunes, forêts de pins, estuaire et longues plages atlantiques.",
    paragraphe_explorer:
      "La Gironde et les Landes assemblent l’océan, les lacs, les pinèdes, les villages du bassin et les grandes lignes sableuses dans une région ample, aérée et immédiatement dépaysante.",
    trois_incontournables: ["Bordeaux", "Dune du Pilat", "Cap Ferret"],
    note_terrain:
      "Ici, le rapport à l’espace est central : grandes plages, forêts, lacs et estuaire donnent au voyage une vraie sensation d’ouverture.",
    intro_longue:
      "La Gironde et les Landes se vivent en grand format. Les plages semblent ne jamais finir, les pinèdes étirent leur trame régulière, les lacs calment le jeu, et Bordeaux vient offrir une intensité plus urbaine au milieu de cet ensemble très aéré.",
    ambiance_detail:
      "Le voyage peut être balnéaire, forestier, estuarien ou plus citadin. C’est précisément cette diversité de rythmes qui rend la région forte : un matin en ville, l’après-midi dans les dunes, le soir près d’un lac ou d’un port.",
  },
  "pays-basque-bearn": {
    accroche_carte: "Océan, collines, villages francs et premiers sommets du sud-ouest.",
    paragraphe_explorer:
      "Le Pays basque et le Béarn font dialoguer le surf, les villages blancs et rouges, les vallées pastorales, les places animées et les routes qui montent déjà vers la montagne.",
    trois_incontournables: ["Biarritz", "Saint-Jean-de-Luz", "Pau"],
    note_terrain:
      "Le contraste côte/intérieur est ici déterminant : stations et plages d’un côté, collines puis vallées béarnaises et pyrénéennes de l’autre.",
    intro_longue:
      "Le Pays basque impose immédiatement son identité : maisons blanches soulignées de rouge, collines rondes, pelote sur les frontons, lumière vive et air salin. Puis le Béarn prolonge le voyage avec des vallées plus ouvertes, un relief plus ample et une tonalité légèrement différente.",
    ambiance_detail:
      "On peut y vivre un séjour très côtier ou, au contraire, s’enfoncer vers l’intérieur pour suivre les vallées, les villages et les routes panoramiques. La région gagne justement à tenir les deux : l’énergie de la côte et la profondeur du piémont.",
  },
  "toulousain-gascogne": {
    accroche_carte: "Briques roses, bastides, collines et horizons tranquilles du sud-ouest.",
    paragraphe_explorer:
      "Le Toulousain et la Gascogne dessinent un sud-ouest plus intérieur, fait de villes chaleureuses, de bastides, de rivières lentes, de champs ondulants et d’étapes généreuses.",
    trois_incontournables: ["Toulouse", "Auch", "Albi"],
    note_terrain:
      "La région se parcourt bien à allure tranquille, entre patrimoine urbain, collines agricoles et petites villes très vivantes.",
    intro_longue:
      "Ici, la couleur vient souvent de la brique, de la terre, des toits et des fins de journée. Le Toulousain et la Gascogne donnent une impression d’espace habité, de campagne tenue, de villes chaleureuses et de routes sans brutalité.",
    ambiance_detail:
      "Le patrimoine y est dense mais jamais écrasant. On passe d’une grande ville à une bastide, d’un clocher à une halle, d’une vallée à une suite de collines. C’est un voyage de matière, de lumière et de douceur méridionale.",
  },
  "rouergue-cevennes": {
    accroche_carte: "Gorges, plateaux, villages de pierre et reliefs de caractère.",
    paragraphe_explorer:
      "Le Rouergue et les Cévennes offrent un voyage plus rugueux, plus minéral, entre causses, vallées encaissées, villages puissants et routes spectaculaires.",
    trois_incontournables: ["Conques", "Gorges du Tarn", "Millau"],
    note_terrain:
      "C’est une région de relief et de contrastes, à vivre par routes panoramiques, haltes de villages et longues vues sur les plateaux.",
    intro_longue:
      "Le Rouergue et les Cévennes tiennent d’emblée une promesse de relief. Les villages y semblent souvent ancrés dans la pente, les gorges ouvrent des coupures franches, les plateaux imposent leur nudité, et la pierre domine.",
    ambiance_detail:
      "Le voyage y est plus physique, plus dessiné, parfois plus austère, mais toujours habité. Il faut aimer les routes qui montent, les horizons cassés, les vallées profondes et les villages qui gardent une forte présence.",
  },
  "languedoc-roussillon": {
    accroche_carte: "Étangs, cités de pierre, garrigue et Méditerranée en grand angle.",
    paragraphe_explorer:
      "Du rivage aux reliefs intérieurs, le Languedoc et le Roussillon enchaînent villes vibrantes, plages, forteresses, vignobles et routes sèches dans une lumière très franche.",
    trois_incontournables: ["Carcassonne", "Collioure", "Montpellier"],
    note_terrain:
      "La région est vaste et très contrastée : mieux vaut l’aborder par séquences, entre littoral, arrière-pays et villages plus méridionaux.",
    intro_longue:
      "Le Languedoc et le Roussillon ont le goût de la Méditerranée large, mais aussi celui des terres plus sèches, des citadelles, des étangs, des vignes et des villages serrés. La lumière y tranche davantage, les reliefs encadrent le regard, et les distances changent vite l’atmosphère.",
    ambiance_detail:
      "On peut y chercher la plage, les villes animées et la douceur du soir, ou préférer les villages, les forteresses, les routes de garrigue et les vallées plus secrètes. C’est une région abondante, presque généreuse jusqu’à l’excès.",
  },
  provence: {
    accroche_carte: "Lavande, pierre claire, villages perchés et lumière sans détour.",
    paragraphe_explorer:
      "La Provence assemble Alpilles, Luberon, villes d’art, champs ouverts, routes parfumées et villages accrochés, dans un décor immédiatement évocateur mais jamais lassant.",
    trois_incontournables: ["Avignon", "Gordes", "Les Baux-de-Provence"],
    note_terrain:
      "La Provence gagne à être vécue tôt le matin et en fin de journée, quand la lumière glisse mieux sur la pierre et que les villages retrouvent un peu de calme.",
    intro_longue:
      "La Provence est l’une des rares régions que l’on croit connaître avant même d’y arriver. Pourtant, sa vraie richesse tient aux nuances : la fraîcheur de certaines vallées, la sécheresse des plateaux, la densité patrimoniale des villes, le calme des villages perchés et la présence constante du vent et de la lumière.",
    ambiance_detail:
      "On y voyage entre places ombragées, routes bordées de cyprès, marchés, carrières, chapelles et belvédères. Le cliché existe, bien sûr, mais la région sait le dépasser par la diversité de ses reliefs et la force de ses matières.",
  },
  "cote-dazur": {
    accroche_carte: "Méditerranée brillante, corniches, villages en hauteur et jardins d’hiver.",
    paragraphe_explorer:
      "La Côte d’Azur ne se réduit pas au rivage : entre criques, villes élégantes, villages perchés et arrière-pays sec et lumineux, elle compose un voyage très complet.",
    trois_incontournables: ["Nice", "Antibes", "Èze"],
    note_terrain:
      "Le littoral attire d’abord, mais l’arrière-pays donne souvent ses plus beaux contrepoints, surtout quand on veut échapper à la densité des stations.",
    intro_longue:
      "La Côte d’Azur joue d’abord sa carte la plus évidente : mer éclatante, palmiers, façades claires, ports et promenades. Mais en quelques kilomètres à peine, la route s’élève et découvre un autre territoire, plus minéral, plus suspendu, presque plus calme.",
    ambiance_detail:
      "C’est cette double lecture qui la rend intéressante : d’un côté le rivage et son énergie, de l’autre les jardins, les collines et les villages perchés. Le voyage peut alors gagner en finesse, entre élégance balnéaire et échappées plus secrètes.",
  },
  corse: {
    accroche_carte: "Montagnes dans la mer, criques nettes et villages accrochés au maquis.",
    paragraphe_explorer:
      "La Corse tient dans le même mouvement la plage, la route vertigineuse, le village de granit, la forêt et le sommet, avec une intensité rare à chaque changement d’échelle.",
    trois_incontournables: ["Bonifacio", "Calanques de Piana", "Corte"],
    note_terrain:
      "La Corse se parcourt lentement : les distances y sont trompeuses, et chaque vallée, chaque golfe, chaque col mérite du temps.",
    intro_longue:
      "En Corse, la montagne n’est jamais loin de la mer. C’est même ce voisinage constant qui donne au voyage sa force particulière : une crique peut succéder à une forêt, puis à un village en balcon, puis à une route de col.",
    ambiance_detail:
      "L’île ne se laisse pas consommer trop vite. Elle demande d’accepter les temps de route, les détours, les changements de lumière et de relief. En échange, elle offre une intensité continue, presque dramatique par endroits, très douce à d’autres.",
  },
  auvergne: {
    accroche_carte: "Volcans, lacs, burons et grands horizons d’altitude douce.",
    paragraphe_explorer:
      "L’Auvergne déploie une montagne ample, accessible et très respirante, entre puys, vallées, villages noirs, stations thermales et routes panoramiques.",
    trois_incontournables: ["Puy de Dôme", "Salers", "Le Mont-Dore"],
    note_terrain:
      "C’est une région idéale pour mêler marche, grands paysages, patrimoine roman et villages de caractère, avec une vraie sensation d’air.",
    intro_longue:
      "L’Auvergne impressionne moins par la verticalité que par l’ampleur. Les reliefs y se succèdent en souples masses volcaniques, les lacs ponctuent les hauteurs, les villages s’abritent, et la route offre souvent des panoramas très larges.",
    ambiance_detail:
      "On y vient pour marcher, bien sûr, mais aussi pour parcourir les vallées, les églises romanes, les stations thermales et les plateaux. L’ensemble donne une région très cohérente, puissante sans être écrasante.",
  },
  savoie: {
    accroche_carte: "Lacs profonds, vallées nettes et sommets qui cadrent chaque regard.",
    paragraphe_explorer:
      "Savoie et Haute-Savoie conjuguent l’eau et l’altitude, les villages, les stations, les alpages et les belvédères, dans un décor montagneux immédiatement spectaculaire.",
    trois_incontournables: ["Annecy", "Chamonix", "Lac du Bourget"],
    note_terrain:
      "La région se prête à toutes les saisons, mais gagne à être pensée par vallées et bassins, tant les ambiances changent d’un lac à un massif.",
    intro_longue:
      "Ici, les lignes sont plus franches. Les vallées guident le voyage, les lacs ouvrent des respirations, et les sommets rappellent en permanence la verticalité du territoire. La Savoie offre une montagne lisible, presque graphique par endroits.",
    ambiance_detail:
      "Le voyage peut être très contemplatif, centré sur les lacs et les villages, ou franchement tourné vers la marche et les cols. Dans tous les cas, l’intensité paysagère reste forte, avec une alternation réussie entre eau, alpage et roche.",
  },
  "dauphine-rhone": {
    accroche_carte: "Entre grande ville, vallées alpines, vignobles et reliefs du sud-est.",
    paragraphe_explorer:
      "Le Dauphiné, le Lyonnais et le Forez composent une région charnière, où la puissance urbaine, les villages, les montagnes proches et les plaines plus douces se répondent sans cesse.",
    trois_incontournables: ["Lyon", "Vercors", "Pérouges"],
    note_terrain:
      "La diversité est ici la vraie richesse : grande ville, vignobles, reliefs, vallées et villages permettent des voyages très variés.",
    intro_longue:
      "Le Dauphiné, le Lyonnais et le Forez ne tiennent pas dans une seule image. Lyon impose sa densité et son rayonnement, puis viennent les vallées, les plaines, les monts et les villages qui déplacent progressivement le regard vers autre chose.",
    ambiance_detail:
      "C’est une région de transition et de combinaison, capable d’assembler culture urbaine, routes de montagne, patrimoine rural et échappées plus méridionales. Cette diversité la rend particulièrement riche à scénariser.",
  },
};
