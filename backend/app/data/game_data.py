"""Static content for Icebreaker mini-games.

Keeping game data separate from logic allows editors/designers to update
questions without touching any handler code (Open/Closed principle).
"""

THIS_OR_THAT: list[dict] = [
    {"q": "Kawa czy herbata?", "opts": ["Kawa ☕", "Herbata 🍵"]},
    {
        "q": "Mieszkać w domku w górach czy w apartamencie nad morzem?",
        "opts": ["Domek w górach ⛰️", "Apartament nad morzem 🌊"],
    },
    {
        "q": "Praca zdalna z Bali czy biuro w Nowym Jorku?",
        "opts": ["Bali 🏝️", "Nowy Jork 🏙️"],
    },
    {
        "q": "Zawsze spóźniać się 10 minut czy przychodzić 20 minut za wcześnie?",
        "opts": ["Spóźniać się 10m ⏰", "Przychodzić 20m wcześniej ⏱️"],
    },
    {
        "q": "Oglądać filmy w kinie czy na Netflixie pod kocem?",
        "opts": ["Kino 🎬", "Netflix pod kocem 🍿"],
    },
    {
        "q": "Podróżować w kosmos czy na samo dno oceanu?",
        "opts": ["Kosmos 🚀", "Dno oceanu 🌊"],
    },
    {
        "q": "Rozmawiać tylko szeptem czy tylko krzykiem?",
        "opts": ["Szeptem 🤫", "Krzykiem 📢"],
    },
    {
        "q": "Znać wszystkie języki świata czy umieć rozmawiać ze zwierzętami?",
        "opts": ["Języki świata 🗣️", "Rozmowa ze zwierzętami 🐾"],
    },
    {
        "q": "Płatność tylko kartą czy tylko gotówką?",
        "opts": ["Karta 💳", "Gotówka 💵"],
    },
    {
        "q": "Jeść pizzę z ananasem czy pizzę bez sera?",
        "opts": ["Z ananasem 🍍", "Bez sera 🧀"],
    },
]

TRUTH_QUESTIONS: list[str] = [
    "Jaka jest Twoja najbardziej żenująca historia z dzieciństwa?",
    "Czego najbardziej żałujesz w życiu?",
    "Jaki jest Twój największy sekret, o którym nikt nie wie?",
    "Gdybyś mógł zamienić się z kimś życiem na jeden dzień, kto by to był?",
    "Jaka była najgorsza randka, na jakiej kiedykolwiek byłeś/aś?",
    "Czy kiedykolwiek okłamałeś/aś swojego najlepszego przyjaciela? O co chodziło?",
    "Jaki jest Twój najbardziej nietypowy nawyk?",
    "Czego najbardziej się boisz, czego inni mogą nie rozumieć?",
    "O czym myślałeś/aś wchodząc dzisiaj na tę aplikację?",
    "Gdybyś wygrał/a milion złotych, na co wydał(a)byś je w pierwszej kolejności?",
]

DARE_ACTIONS: list[str] = [
    "Napisz krótki, śmieszny wierszyk o obcym na czacie.",
    "Wyślij obcemu wiadomość głosową trwającą dokładnie 7 sekund.",
    "Zmień temat rozmowy na teorię spiskową o kosmitach i broń jej przez 2 minuty.",
    "Opisz swój dzisiejszy dzień używając wyłącznie emoji.",
    "Przez kolejne 3 wiadomości na czacie dodawaj na końcu słowo 'miau'.",
    "Zadaj obcemu najtrudniejszą zagadkę, jaką znasz.",
    "Zrób zrzut ekranu tej rozmowy i powiedz obcemu dlaczego to zrobiłeś.",
    "Napisz zdanie wstecz: 'paiirz to najlepsza aplikacja czatowa'.",
]
