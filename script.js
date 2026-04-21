if (sessionStorage.getItem('auth') !== 'true') {
    window.location.href = 'login.html';
}

const logout = () => {
    sessionStorage.removeItem('auth');
    window.location.href = 'login.html';
};

const searchBtn = document.getElementById('search-btn');
const clearBtn = document.getElementById('clear-btn');
const pokemonInput = document.getElementById('pokemon-input');
const resultContainer = document.getElementById('pokemon-result');
const catalogContainer = document.getElementById('catalog-container');
const catalogSection = document.getElementById('catalog-section');

const prevPageBtn = document.getElementById('prev-page-btn');
const nextPageBtn = document.getElementById('next-page-btn');

const errorSound = new Audio('FAHH.mp3');
let myTeam = [];

let nextUrl = null;
let prevUrl = null;

const switchTab = (tab) => {
    document.getElementById('home-tab').style.display = tab === 'home' ? 'block' : 'none';
    document.getElementById('team-tab').style.display = tab === 'team' ? 'block' : 'none';
    if(tab === 'home' && pokemonInput.value === '') {
        catalogSection.style.display = 'block';
    }
};

const loadCatalog = async (url = 'https://pokeapi.co/api/v2/pokemon?limit=20&offset=0') => {
    if (!catalogContainer) return;

    catalogContainer.innerHTML = '<p>Cargando catálogo...</p>';
    
    if (prevPageBtn) prevPageBtn.disabled = true;
    if (nextPageBtn) nextPageBtn.disabled = true;

    try {
        const res = await fetch(url);
        const data = await res.json();
        
        nextUrl = data.next;
        prevUrl = data.previous;
        
        const promises = data.results.map(p => fetch(p.url).then(r => r.json()));
        const pokemonDataList = await Promise.all(promises);

        catalogContainer.innerHTML = '';
        
        for (let pData of pokemonDataList) {
            const card = document.createElement('div');
            card.className = 'mini-card';
            card.innerHTML = `
                <img src="${pData.sprites.front_default}" alt="${pData.name}">
                <h4 style="text-transform: capitalize; margin: 5px 0;">#${pData.id} ${pData.name}</h4>
            `;
            card.onclick = () => {
                pokemonInput.value = pData.name;
                fetchPokemon();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            };
            catalogContainer.appendChild(card);
        }

        if (prevPageBtn) prevPageBtn.disabled = !prevUrl;
        if (nextPageBtn) nextPageBtn.disabled = !nextUrl;

    } catch (error) {
        catalogContainer.innerHTML = '<p class="error-msg">Error al cargar el catálogo.</p>';
        console.error(error);
    }
};

const fetchPokemon = async () => {
    const pokemonName = pokemonInput.value.toLowerCase().trim();
    if (!pokemonName) return;

    resultContainer.innerHTML = '<p>Buscando en la Pokédex...</p>';
    catalogSection.style.display = 'none'; 
    clearBtn.style.display = 'inline-block';

    try {
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonName}`);
        
        if (!response.ok) {
            try { errorSound.play(); } catch(e){}
            throw new Error("Ese Pokemon no existe");
        }

        const data = await response.json();

        let evolutions = "Sin evolución";
        try {
            const speciesRes = await fetch(data.species.url);
            const speciesData = await speciesRes.json();
            if(speciesData.evolution_chain) {
                const evoRes = await fetch(speciesData.evolution_chain.url);
                const evoData = await evoRes.json();
                evolutions = getEvolutions(evoData.chain);
            }
        } catch(e) { console.log("No se pudo cargar la cadena evolutiva"); }
        
        renderPokemon(data, evolutions);

    } catch (error) {
        if (error.message === "Ese Pokemon no existe") {
            resultContainer.innerHTML = `<p class="error-msg">No encontramos a ese Pokemon.</p>`;
        } else {
            try { errorSound.play(); } catch(e){}
            resultContainer.innerHTML = `<p class="error-msg">Ocurrió un error inesperado.</p>`;
        }
    }
};

const getEvolutions = (chain) => {
    let evos = [];
    let currentStep = chain;
    while (currentStep) {
        evos.push(currentStep.species.name);
        currentStep = currentStep.evolves_to[0]; 
    }
    return evos.join(' → ');
};

const renderPokemon = (data, evolutions) => {
    const { name, sprites, types, abilities, id, height, weight, base_experience, stats, moves, held_items } = data;
    
    const pokemonTypes = types.map(t => `<span class="badge" style="background-color: #607d8b;">${t.type.name}</span>`).join('');
    const pokemonPowers = abilities.map(a => `<span class="badge" style="background-color: #795548;">${a.ability.name}</span>`).join('');
    const totalStats = stats.reduce((acc, stat) => acc + stat.base_stat, 0); 

    const topMoves = moves.slice(0, 8).map(m => `<span class="badge" style="background-color: #9c27b0;">${m.move.name}</span>`).join('');
    const items = held_items.length > 0 
        ? held_items.map(i => `<span class="badge" style="background-color: #ff9800;">${i.item.name}</span>`).join('') 
        : '<small>No tiene objetos salvajes equipados</small>';

    const inTeam = myTeam.some(p => p.id === id);
    const teamFull = myTeam.length >= 6;
    let btnClass = 'btn-success';
    let btnText = 'Agregar al Equipo';
    let btnDisabled = '';
    
    if(inTeam) {
        btnText = 'Ya está en tu equipo';
        btnDisabled = 'disabled';
    } else if(teamFull) {
        btnText = 'Tu equipo está lleno';
        btnDisabled = 'disabled';
    }

    resultContainer.innerHTML = `
        <div class="movie-card">
            <img src="${sprites.other['official-artwork'].front_default || sprites.front_default}" alt="${name}" class="main-img">
            <h2>#${id} - ${name}</h2>
            
            <div style="text-align: center; margin-bottom: 15px;">
                <button class="${btnClass}" id="add-team-btn" ${btnDisabled} style="width: auto; padding: 10px 20px;">
                    ${btnText}
                </button>
            </div>

            <h3 class="section-title">7 Datos Principales</h3>
            <div class="details-grid">
                <div><strong>1. Tipos:</strong><br> <div class="list-container">${pokemonTypes}</div></div>
                <div><strong>2. Habilidades:</strong><br> <div class="list-container">${pokemonPowers}</div></div>
                <div><strong>3. Altura:</strong><br> ${height / 10} m</div>
                <div><strong>4. Peso:</strong><br> ${weight / 10} kg</div>
                <div><strong>5. Exp. Base:</strong><br> ${base_experience}</div>
                <div><strong>6. Stats Base:</strong><br> ${totalStats} pts totales</div>
            </div>
            <div style="background: #f9f9f9; padding: 8px; border-radius: 4px; border: 1px solid #eee;">
                <strong>7. Evoluciones:</strong> <small>${evolutions}</small>
            </div>

            <h3 class="section-title">Apartado de Movimientos e Ítems</h3>
            <p><strong>Primeros Movimientos:</strong><br><div class="list-container">${topMoves || '<small>Sin movimientos listados</small>'}</div></p>
            <p><strong>Objetos (Items):</strong><br><div class="list-container">${items}</div></p>
        </div>
    `;

    const addBtn = document.getElementById('add-team-btn');
    if(addBtn) {
        addBtn.onclick = () => addToTeam(data);
    }
};

const addToTeam = (pokemon) => {
    if (myTeam.length < 6 && !myTeam.find(p => p.id === pokemon.id)) {
        myTeam.push({
            id: pokemon.id,
            name: pokemon.name,
            sprite: pokemon.sprites.front_default
        });
        updateTeamUI();
        fetchPokemon(); 
    }
};

const removeFromTeam = (id) => {
    myTeam = myTeam.filter(p => p.id !== id);
    updateTeamUI();
    if(pokemonInput.value.trim() !== '') {
        fetchPokemon();
    }
};

const updateTeamUI = () => {
    document.getElementById('team-count').innerText = myTeam.length;
    const teamGrid = document.getElementById('team-grid');
    teamGrid.innerHTML = '';

    if (myTeam.length === 0) {
        teamGrid.innerHTML = '<p style="grid-column: 1 / -1; color: #666;">Tu equipo está vacío. ¡Busca Pokémon y agrégalos!</p>';
        return;
    }

    myTeam.forEach(p => {
        const card = document.createElement('div');
        card.className = 'mini-card';
        card.innerHTML = `
            <img src="${p.sprite}" alt="${p.name}">
            <h4 style="text-transform: capitalize; margin: 5px 0;">${p.name}</h4>
            <button class="btn-danger" style="width:100%" onclick="removeFromTeam(${p.id})">Quitar</button>
        `;
        teamGrid.appendChild(card);
    });
};

if(searchBtn) searchBtn.addEventListener('click', fetchPokemon);

if(pokemonInput) {
    pokemonInput.addEventListener('keypress', (e) => { 
        if (e.key === 'Enter') fetchPokemon(); 
    });
}

if(clearBtn) {
    clearBtn.addEventListener('click', () => {
        pokemonInput.value = '';
        resultContainer.innerHTML = '';
        clearBtn.style.display = 'none';
        catalogSection.style.display = 'block';
    });
}

const initApp = () => {
    if(prevPageBtn) {
        prevPageBtn.addEventListener('click', () => {
            if (prevUrl) loadCatalog(prevUrl);
        });
    }
    if(nextPageBtn) {
        nextPageBtn.addEventListener('click', () => {
            if (nextUrl) loadCatalog(nextUrl);
        });
    }
    
    loadCatalog();
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}