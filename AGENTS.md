# Voyageur — Multi-Agent Workflow

Per ogni feature eseguiamo 5 fasi in sequenza. Ogni agente ha un ruolo preciso e non esce dal proprio scope.

---

## Le 5 Fasi

### 1. ARCHITECT
**Pianifica, non implementa.**
- Elenca i file da creare/modificare
- Definisce TypeScript types e interfacce
- Descrive il flusso dati (store → component → UI)
- Identifica dipendenze tra file
- **NON scrive codice sorgente**

### 2. BUILDER
**Implementa seguendo il piano dell'Architect.**
- Segue esattamente i file e types pianificati
- Rispetta tutte le regole del CLAUDE.md
- Usa mock data strutturata come i dati reali delle API
- Non inventa strutture non pianificate

### 3. FRONTEND
**Revisiona e migliora UI/UX.**
- Controlla spacing, border radius, colori (rispetta il tema)
- Verifica touch targets (min 44×44pt)
- Aggiunge animazioni/transizioni dove mancano
- Controlla safe area, keyboard avoidance, scroll behavior
- Verifica che loading, error e empty state siano presenti e ben disegnati

### 4. REVIEWER
**Code review tecnico.**
- TypeScript strict: niente `any`, tutti i types coperti
- Error handling: try/catch dove necessario, stati fallback
- Edge cases: lista vuota, valore null/undefined, rete assente
- Offline-first: verifica cache SQLite
- Sicurezza: nessun dato sensibile in AsyncStorage, SecureStore per passaporto
- Performance: no re-render inutili, FlatList per liste lunghe, memo dove serve

### 5. FIXER
**Corregge tutto ciò che Reviewer ha trovato.**
- Risolve ogni issue aperta dal Reviewer
- Non introduce nuove feature
- Conferma che ogni fix sia verificabile

---

## Regole Globali

- Ogni agente annuncia la propria fase all'inizio: `## FASE X — NOME`
- L'Architect produce sempre un piano leggibile prima del codice
- Il Builder non bypassa il piano dell'Architect
- Il Frontend non tocca logica o types
- Il Reviewer non corregge direttamente — lista issue numerate
- Il Fixer chiude ogni issue con riferimento al numero

## Stack di riferimento
Vedi CLAUDE.md per stack, struttura cartelle, design system e regole.
