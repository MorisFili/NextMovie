# NextMovie

Syftet med appen är att erbjuda ett friktionsfritt sätt för att kunna navigera en databas av filmer och få allt som behövs
för att bestämma vilken film man vill se härnest. Genom att interagera med appen är tanken att användaren ska kunna skräddarsy
sin egen anonyma användarprofil och få nya filmrekommendationer baserat på denna.


## Funktioner

- Bläddra bland filmer i ett rutnät och hämta fler genom att scrolla.
- Öppna en film för att se handling, genre, IMDb-betyg och trailer.
- Öppna filmens IMDb-sida i en extern webbläsare.
- Registrera ett konto, logga in och logga ut.
- Spara, ändra och ta bort egna gillade och ogillade filmer.
- Söka efter titel och kombinera filter för genre, betyg och utgivningsår.
- Sortera efter titel, utgivningsår eller IMDb-betyg, eller välja slumpmässig ordning.

Som gäst kan man bläddra bland filmer och öppna detaljvyer. 
Sökning, filter och personliga filmval används efter inloggning. 

Interaktionen sker genom "Gestures". 
Håll fingret på en filmposter tills kortet "aktiveras" och dra åt höger för att gilla, åt vänster för att ogilla eller uppåt för att ta bort filmvalet. 
Gillade och ogillade filmer nås via kontomenyn.

## REST API

Mobilappen kommunicerar med projektets egen Ktor-backend via HTTP och JSON. Servern använder port `8080` som standard

### APIer

* `POST /default` | Hämta filmer som gäst. |
* `POST /auth/register` | Skapa konto och logga in. |
* `POST /auth/login` | Logga in med ett befintligt konto. |
* `POST /query` | Hämta filmer med användarens filter och sortering. |
* `GET /preferences` | Hämta användarens sparade preferenser. |
* `POST /preferences/{movieId}` | Skapa ett preferenser. |
* `PATCH /preferences/{movieId}` | Ändra ett preferenser. |
* `DELETE /preferences/{movieId}` | Ta bort ett preferenser. |
* `POST /auth/logout` | Avsluta inloggningssessionen. |

Skyddade anrop skickar sessionstoken i headern `Authorization: Bearer <token>`. Backend kontrollerar token och kopplar filmvalen till rätt användare.

Filmdata läses från backendens SQLite-databas. Affischbilder hämtas från TMDB:s bildserver och trailers visas i en WebView från YouTube. 
Samtliga externa anrop är publika och behöver ingen egen API-nyckel.

## Registrering och inloggning

Öppna kontomenyn uppe till höger, ange användarnamn och lösenord och välj **Sign up** för att registrera eller **Sign in** för att logga in. 
Backend lagrar lösenord hashat med Argon2 och returnerar en auktoriserad sessionstoken efter lyckad autentisering. 
Fel visas exempelvis om användarnamnet redan finns eller inloggningsuppgifterna är felaktiga.

Efter inloggning hämtas användarens sparade filmval. Vid nästa appstart läses den sparade token och används för att försöka återställa inloggningen. 
**Sign out** avslutar sessionen på servern och tar bort token från mobilen.

## Lokal lagring

- **Expo SecureStore:** lagrar sessionstoken på mobilen mellan appstarter. Lösenord sparas inte lokalt av appen.
- **SQLite i backend:** lagrar filmer, användare, filmval och sessioner i `backend/data/`. Databaserna finns på servern, inte i mobilappen.


## Mobilfunktion

Appen använder React Natives **Linking** för att öppna den valda filmens IMDb-sida i mobilens webbläsare. 
Om länken inte kan öppnas visas ett felmeddelande.


# Installation

### Frontend

Öppna en terminal i projektroten:

```powershell
cd frontend
npm install
npm run android
```

### Backend

Bygg och kör backend från projektroten:

```powershell
cd backend
.\gradlew.bat run
```

Eller via IDEn

### API-adress

Ändra `localhost` i `frontend/data/Settings.js` till adressen där backend körs, exempelvis:

```javascript
export const localhost = "http://DATORNS_LOKALA_IP:8080/"
```

Om frontend körs på emulatorn på samma dator kan man istället använda:
```javascript
export const localhost = "http://10.0.2.2:8080/"
```



## Kända problem och begränsningar

- API-adressen är hårdkodad och behöver anpassas till datorn och nätverket.
- Appen behöver nätverksanslutning. Det finns ingen offlinecache av filmer.
- OAuth auktoriseringen **Continue with Google** är en platshållare för tillfället.
- Trailers och affischbilder är beroende av externa tjänster.
- Backend använder HTTP och inte HTTPS.
