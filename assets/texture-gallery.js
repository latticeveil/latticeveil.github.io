// Texture and Model Gallery System - Updated with Latest Textures
class TextureGallery {
    constructor() {
        this.init();
    }

    init() {
        this.populateGalleries();
        this.setupURLRouting();
        // Make instance globally available for navigation
        window.textureGallery = this;
        
        // Debug: Log all blocks on initialization
        setTimeout(() => {
            this.debugAllAssets();
        }, 1000);
    }

    setupURLRouting() {
        // Check if we have asset parameter
        const urlParams = new URLSearchParams(window.location.search);
        const assetName = urlParams.get('asset');
        const devlogParam = urlParams.get('devlog');
        const typeParam = urlParams.get('type');

        console.log('URL Routing - Asset:', assetName, 'Devlog:', devlogParam, 'Type:', typeParam);

        if (assetName) {
            console.log('Switching to assets tab for:', assetName);
            this.switchToTab('assets');
            
            // Auto-show popup if we have an asset name
            setTimeout(() => {
                const asset = this.findAssetByName(assetName);
                if (asset) {
                    const viewType = typeParam || '2D'; // Default to 2D if no type specified
                    this.showAssetPopup(asset.name, asset.image, assetName, viewType);
                }
            }, 500); // Small delay to ensure tab is loaded
        } else if (devlogParam !== null) {
            console.log('Switching to devlog tab with type:', typeParam);
            this.switchToTab('devlog');
            
            // Switch to the correct sub-tab based on type
            if (typeParam === 'site') {
                // Trigger website sub-tab
                const websiteTab = document.querySelector('[onclick*="log-website"]');
                if (websiteTab) {
                    websiteTab.click();
                }
            }
        }
    }

    switchToTab(tabName) {
        // Hide all tabs
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.style.display = 'none';
        });
        
        // Remove active class from all tab links
        document.querySelectorAll('.tab-link').forEach(link => {
            link.classList.remove('active');
        });
        
        // Show selected tab
        const selectedTab = document.getElementById(tabName);
        if (selectedTab) {
            selectedTab.style.display = 'block';
        }
        
        // Add active class to selected tab link
        const tabLinks = document.querySelectorAll('.tab-link');
        tabLinks.forEach(link => {
            if (link.getAttribute('onclick').includes(tabName)) {
                link.classList.add('active');
            }
        });
    }

    findAssetByName(name) {
        // Create a comprehensive asset lookup with detailed descriptions based on game lore
        const allAssets = [
            // Natural Resources - Latest Textures
            { 
                name: 'dirt', 
                image: 'assets/img/dirt.png', 
                description: 'Common earth block that forms the foundation beneath grass blocks. Found at all depth levels throughout The Continuum and can be easily mined with any tool. Used extensively as filler material in construction and terrain shaping.'
            },
            { 
                name: 'grass', 
                image: 'assets/img/grass.png', 
                description: 'Living surface layer that forms the foundation of most biomes in The Continuum. This grass-covered dirt block is the primary location where plant life can grow and spreads to adjacent dirt blocks with sufficient light. Changes to plain dirt when covered by opaque blocks.'
            },
            { 
                name: 'stone', 
                image: 'assets/img/stone.png', 
                description: 'Solid rock block that forms the underground foundation of The Continuum. Provides structural stability and is commonly found beneath dirt layers. Essential for construction and mining operations throughout the world.'
            },
            { 
                name: 'sand', 
                image: 'assets/img/sand.png', 
                description: 'Granular block found in desert regions and beaches throughout The Continuum. Falls due to gravity when unsupported and forms the foundation of sandy biomes. Common in areas with high erosion and water activity.'
            },
            { 
                name: 'water', 
                image: 'assets/img/water.png', 
                description: 'Dynamic fluid block that flows naturally and fills empty spaces, creating rivers, lakes, and oceans throughout The Continuum. Essential for world generation and can be collected in buckets for transport and placement.'
            },
            { 
                name: 'wood', 
                image: 'assets/img/wood.png', 
                description: 'Natural wood block harvested from trees throughout The Continuum. Represents the trunk material and is essential for construction and crafting. Used as building material and fuel source throughout the world.'
            },
            { 
                name: 'leaves', 
                image: 'assets/img/leaves.png', 
                description: 'Organic blocks that grow on trees throughout The Continuum. Provide natural barriers and represent the living aspect of the world. Decay over time when separated from wood sources and drop saplings for new tree growth.'
            },
            { 
                name: 'gravel', 
                image: 'assets/img/gravel.png', 
                description: 'Loose mineral aggregate that falls when unsupported throughout The Continuum. Common underground material found in mountain biomes and cave systems. Used in construction and terrain shaping projects.'
            },
            
            // Construction & Utilities - Latest Textures
            { 
                name: 'chest', 
                image: 'assets/img/chest.png', 
                description: 'Wooden storage container for organizing and protecting items throughout The Continuum. Essential for base organization and protects items from despawning, making them invaluable for long-term storage solutions.'
            },
            { 
                name: 'glass', 
                image: 'assets/img/glass.png', 
                description: 'Transparent block created through specialized processing that allows light to pass while providing protection. Used for windows and observation areas throughout The Continuum. Represents dimensional observation technology and maintains separation while allowing visibility.'
            },
            { 
                name: 'plank', 
                image: 'assets/img/plank.png', 
                description: 'Processed wood building material created from raw wood blocks. Essential for construction projects throughout The Continuum. Provides versatile building material for structures, flooring, and decorative elements.'
            },
            { 
                name: 'artificer_bench', 
                image: 'assets/img/artificer_bench.png', 
                description: 'Advanced crafting station required for magical and technical items that manipulate dimensional forces. This specialized workbench processes dimensional materials and creates limiters, conduits, and other endgame equipment. Essential for advanced crafting recipes and represents the pinnacle of technological achievement within The Continuum.'
            },
            
            // Ores & Precious Minerals - Latest Textures
            { 
                name: 'coal', 
                image: 'assets/img/coal.png', 
                description: 'Fossil fuel ore found throughout The Continuum that serves as a common energy source. Essential for various processing operations and can be used for lighting. Found at all depths and represents one of the fundamental energy resources in the world.'
            },
            { 
                name: 'iron', 
                image: 'assets/img/iron.png', 
                description: 'Versatile metal ore that forms the backbone of tool and equipment production in The Continuum. This medium-rarity material is essential for tools, weapons, and construction. Provides the structural foundation for most mechanical devices and building reinforcements.'
            },
            { 
                name: 'gold', 
                image: 'assets/img/gold.png', 
                description: 'Precious metal with unique dimensional properties found deep underground in The Continuum. This rare and valuable material is used in advanced crafting recipes and specialized devices. Functions as both decorative element and critical component in dimensional technology.'
            },
            { 
                name: 'diamond', 
                image: 'assets/img/diamond.png', 
                description: 'The ultimate material in The Continuum, representing the pinnacle of mining achievement. This extremely rare gem creates the most durable tools and equipment. Essential for advanced operations and represents absolute mastery of material science.'
            },
            { 
                name: 'runestone', 
                image: 'assets/img/runestone.png', 
                description: 'Magical stone infused with ancient dimensional knowledge from early dimensional travelers. These rare glowing ore blocks resonate with dimensional energy and are used in specialized crafting. Contains fragments of understanding from those who first understood dimensional mechanics.'
            },
            { 
                name: 'veinstone', 
                image: 'assets/img/veinstone.png', 
                description: 'Crystalline ore that channels dimensional energy throughout The Continuum. These specialized mineral formations are found in areas with high dimensional activity and are essential for advanced dimensional technology. Used in crafting devices that manipulate dimensional forces.'
            },
            
            // Continuist Lore Blocks - Latest Textures
            { 
                name: 'resonance_core', 
                image: 'assets/img/resonance_core.png', 
                description: 'The mysterious heart of dimensional technology that powers the most advanced dimensional devices in The Continuum. This extremely rare energy core emits dimensional resonance frequency and represents the pinnacle of Continuist research. Essentially a contained piece of dimensional energy that demonstrates Parallel Earth\'s ultimate achievement - the ability to capture and control the very forces that separate worlds.'
            },
            { 
                name: 'waybound_frame', 
                image: 'assets/img/waybound_frame.png', 
                description: 'Dimensional stabilizer that maintains safe pathways between realities during transit in The Continuum. This frame prevents dimensional collapse and temporal paradoxes while resonating with limiter technology. Essential for safe dimensional travel and represents the natural laws that keep dimensional travel from destroying everything by maintaining order in the face of dimensional stress.'
            },
            { 
                name: 'transit_regulator', 
                image: 'assets/img/transit_regulator.png', 
                description: 'Advanced device that controls dimensional flow and prevents dangerous dimensional pressure buildup during transit operations. This regulator maintains safe transit conditions and prevents Echo contamination while operating through complex internal mechanisms. Represents the careful balance required for dimensional travel where passages must not become too dangerous for travelers.'
            },
            { 
                name: 'veilglass', 
                image: 'assets/img/veilglass.png', 
                description: 'Enhanced glass that can phase between dimensions and exist in multiple states of reality simultaneously throughout The Continuum. This advanced material is transparent in multiple realities and used in dimensional construction projects. Represents the ultimate understanding of dimensional boundaries - unlike normal glass which only observes, veilglass can exist within the Veil itself.'
            },
            { 
                name: 'nullrock', 
                image: 'assets/img/nullrock.png', 
                description: 'Reality-warping stone that exists between dimensional boundaries and defies normal physics and dimensional rules throughout The Continuum. This dangerous but useful material warps local reality and is essential for exotic dimensional crafting. Represents the ultimate danger of dimensional travel - existing in spaces between worlds makes it both incredibly useful and incredibly hazardous, like knowledge that grants godlike power at terrible cost.'
            },
            
            // Player Texture
            { 
                name: 'player_default', 
                image: 'assets/img/player_default.png', 
                description: 'Default AND offline texture for the player model. This is what all players default to if not adding a skin and can be locally changed for LAN/offline play. Represents the Continuist faction and serves as the base identity for all new dimensional travelers entering The Continuum from Parallel Earth.'
            },
            
            // Legacy Archive: Experimental Designs
            { 
                name: 'artificer_bench_V1', 
                image: 'assets/img/legacy/artificer_bench_V1.png', 
                description: 'Early prototype of the advanced crafting station that represents first attempts at creating dimensional manipulation tools. This experimental design features the original crafting table system before dimensional understanding was achieved, with an experimental 3x3 grid system that pre-dates Echo pressure research. This early design shows how Parallel Earth researchers first began to understand voxel world manipulation through structured crafting patterns.'
            },
            { 
                name: 'door_V1', 
                image: 'assets/img/legacy/door_V1.png', 
                description: 'Early prototype of dimensional passage control representing first attempts at creating controlled boundaries within the voxel world. This experimental door design features the original door mechanism before dimensional stability research was achieved, with basic open/close functionality that pre-dates limiter technology integration. Shows early understanding that passage between spaces needed to be controlled for safe dimensional travel.'
            },
            { 
                name: 'patchy_grass', 
                image: 'assets/img/legacy/grass_patchy.png', 
                description: 'Early attempt at creating dynamic surface blocks that represents research into making surface biomes more variable and realistic. This experimental grass texture features an experimental biome variation system with attempted organic growth patterns that pre-date stable biome mechanics. Shows early Parallel Earth research into making the voxel world feel more natural, though patchy patterns proved too unstable for the final dimensional system.'
            },
            
            // Legacy Archive: The HD Era (V1)
            { 
                name: 'dirt_HD', 
                image: 'assets/img/legacy/hd/dirt_HD.png', 
                description: 'High-definition experimental version of the fundamental dirt block representing Parallel Earth\'s first attempts at increasing visual fidelity in the voxel world. This early HD texture features an experimental high-resolution texture system with attempted photorealistic approach that pre-dates stable dimensional rendering. The HD experiments showed that too much visual detail could destabilize the dimensional system, leading to the balanced approach used in current textures.'
            },
            { 
                name: 'grass_HD', 
                image: 'assets/img/legacy/hd/grass_HD.png', 
                description: 'High-definition experimental grass texture attempting to create more detailed surface vegetation while maintaining dimensional stability. This version features an experimental surface detail system with high-resolution grass blade rendering that pre-dates stable biome mechanics. The HD grass experiment revealed that excessive natural detail could create dimensional interference, leading to the current simpler grass pattern that provides better stability.'
            },
            { 
                name: 'stone_HD', 
                image: 'assets/img/legacy/hd/stone_HD.png', 
                description: 'High-definition experimental stone texture attempting to create more realistic stone surfaces with detailed crystalline structures. This version features an experimental mineral rendering system with high-resolution crystalline patterns that pre-dates stable underground mechanics. The HD stone experiments showed that too much geological detail could interfere with dimensional stability, leading to the current stone texture that maintains essential stability while representing the bedrock foundation.'
            },
            { 
                name: 'sand_HD', 
                image: 'assets/img/legacy/hd/sand_HD.png', 
                description: 'High-definition experimental sand texture attempting to create more detailed granular surfaces with individual particle rendering. This version features an experimental granular material system with high-resolution particle simulation that pre-dates stable desert biome mechanics. The HD sand experiments revealed that detailed particle rendering could create dimensional instability, leading to the current sand texture that maintains essential flowing nature while preserving dimensional integrity.'
            },
            { 
                name: 'water_HD', 
                image: 'assets/img/legacy/hd/water_HD.png', 
                description: 'High-definition experimental water texture attempting to create more realistic fluid dynamics with detailed surface ripples and transparency. This version features an experimental fluid dynamics system with high-resolution surface simulation that pre-dates stable water mechanics. The HD water experiments showed that complex fluid dynamics could interfere with dimensional flow, leading to the current water texture that maintains essential fluid nature while preserving dimensional flow properties.'
            },
            { 
                name: 'wood_HD', 
                image: 'assets/img/legacy/hd/wood_HD.png', 
                description: 'High-definition experimental wood texture attempting to create more detailed wood grain patterns with individual ring structures. This version features an experimental organic material system with high-resolution grain simulation that pre-dates stable tree mechanics. The HD wood experiments revealed that excessive organic detail could create dimensional interference, leading to the current wood texture that maintains essential organic nature while preserving dimensional stability for living materials.'
            },
            { 
                name: 'leaves_HD', 
                image: 'assets/img/legacy/hd/leaves_HD.png', 
                description: 'High-definition experimental leaves texture attempting to create more detailed foliage with individual leaf structures and vein patterns. This version features an experimental plant rendering system with high-resolution foliage simulation that pre-dates stable plant mechanics. The HD leaves experiments showed that detailed botanical structures could interfere with dimensional barriers that leaves represent, leading to the current leaves texture that maintains essential protective barrier function while preserving dimensional stability.'
            },
            
            // Legacy Archive: V9
            { 
                name: 'coal_V9', 
                image: 'assets/img/legacy/v9/coal_V9.png', 
                description: 'Version 9 iteration of the coal ore texture representing the stabilization phase of ore rendering before the current system. This version features V9 stability improvements with refined energy visualization that pre-dates the current ore system. The V9 coal texture represents the moment when Parallel Earth researchers understood that energy resources needed to be visually distinct but dimensionally stable, establishing the foundation for all current ore textures.'
            },
            { 
                name: 'glass_V9', 
                image: 'assets/img/legacy/v9/glass_V9.png', 
                description: 'Version 9 iteration of the glass block attempting to improve transparency while maintaining dimensional stability. This version features V9 transparency experiments with improved clarity system that pre-dates current glass mechanics. The V9 glass experiments helped establish the principles of dimensional observation - how beings from one reality could safely view another without causing interference, leading to the one-way observation properties of current glass.'
            },
            { 
                name: 'gold_V9', 
                image: 'assets/img/legacy/v9/gold_V9.png', 
                description: 'Version 9 iteration of the gold ore texture refining the visual representation of precious dimensional materials. This version features V9 precious material refinement with improved dimensional rarity visualization that pre-dates current gold mechanics. The V9 gold texture represents the discovery that certain materials could conduct dimensional energy, leading to gold\'s special role in dimensional technology and its rarity in the voxel world.'
            },
            { 
                name: 'iron_V9', 
                image: 'assets/img/legacy/v9/iron_V9.png', 
                description: 'Version 9 iteration of the iron ore texture establishing iron as the standard for dimensional stability and protection. This version features V9 stability standardization with refined structural visualization that pre-dates current iron mechanics. The V9 iron texture represents the realization that some materials could provide protection from dimensional instability, leading to iron\'s role in creating limiter devices and protective equipment for dimensional travel.'
            },
            { 
                name: 'leaves_V9', 
                image: 'assets/img/legacy/v9/leaves_V9.png', 
                description: 'Version 9 iteration of the leaves texture refining the balance between organic appearance and dimensional barrier function. This version features V9 organic barrier refinement with improved natural filtering visualization that pre-dates current leaf mechanics. The V9 leaves experiments helped establish how natural materials could serve as dimensional barriers, leading to leaves representing the Veil itself - allowing some things to pass while blocking others.'
            },
            { 
                name: 'veilglass_V9', 
                image: 'assets/img/legacy/v9/veilglass_V9.png', 
                description: 'Version 9 iteration of the advanced dimensional glass representing early attempts at creating materials that could exist within dimensional boundaries. This version features V9 dimensional material experiments with early Veil integration attempts that pre-dates current veilglass mechanics. The V9 veilglass experiments were crucial in understanding how materials could exist within the Veil itself, leading to the current veilglass that can phase between dimensions safely.'
            },
            { 
                name: 'grass_patchy_V9', 
                image: 'assets/img/legacy/v9/grass_patchy_V9.png', 
                description: 'Version 9 iteration of experimental grass patterns refining the patchy grass concept with better dimensional stability. This version features V9 biome variation refinement with improved organic pattern system that pre-dates current grass mechanics. The V9 patchy grass represents the final experiments with variable surface patterns before settling on the stable uniform grass, showing that too much surface variation could interfere with dimensional stability.'
            }
        ];

        return allAssets.find(asset => asset.name === name);
    }

    getAllAssets() {
        // Return ALL assets from all galleries for complete navigation
        const allAssets = [];
        
        // Natural Resources
        allAssets.push(
            { id: 'dirt', name: 'Dirt', image: 'assets/img/dirt.png', description: 'Common earth block that forms the foundation beneath grass blocks. Found at all depth levels throughout The Continuum and can be easily mined with any tool. Used extensively as filler material in construction and terrain shaping.' },
            { id: 'grass', name: 'Grass', image: 'assets/img/grass.png', description: 'Surface block that covers dirt blocks in most biomes. Spreads naturally to adjacent dirt blocks with adequate light. Essential for preventing erosion and supporting plant life growth.' },
            { id: 'stone', name: 'Stone', image: 'assets/img/stone.png', description: 'Fundamental building block found throughout The Continuum. Forms the base structure of most terrain and mountains. Can be crafted into various tools and building materials.' },
            { id: 'sand', name: 'Sand', image: 'assets/img/sand.png', description: 'Granular block found in desert biomes and beaches. Falls when unsupported and can be crafted into glass or used as decoration. Supports certain types of plant growth.' },
            { id: 'water', name: 'Water', image: 'assets/img/water.png', description: 'Dynamic fluid block that flows naturally and fills empty spaces, creating rivers, lakes, and oceans throughout The Continuum. Essential for world generation and can be collected in buckets for transport and placement.' },
            { id: 'wood', name: 'Wood', image: 'assets/img/wood.png', description: 'Natural block harvested from tree trunks. Essential building material for construction, tools, and crafting. Comes in various wood types depending on tree species.' },
            { id: 'leaves', name: 'Leaves', image: 'assets/img/leaves.png', description: 'Decorative blocks that grow on trees. Drop saplings when broken and can be used for decoration or composting. Change color based on tree type and seasonal variations.' },
            { id: 'gravel', name: 'Gravel', image: 'assets/img/gravel.png', description: 'Loose stone block affected by gravity. Falls when unsupported and commonly found underground or in mountain biomes. Can be crafted into concrete or used as filler material.' }
        );
        
        // Construction & Utilities
        allAssets.push(
            { id: 'chest', name: 'Chest', image: 'assets/img/chest.png', description: 'Storage block used to store items and materials. Essential base building component for organizing resources and equipment.' },
            { id: 'glass', name: 'Glass', image: 'assets/img/glass.png', description: 'Transparent block created by smelting sand. Used for windows and decorative building elements that allow light to pass through.' },
            { id: 'plank', name: 'Plank', image: 'assets/img/plank.png', description: 'Processed wood block used for construction and crafting. Essential building material created from logs in various wood types.' },
            { id: 'artificer_bench', name: 'Artificer Bench', image: 'assets/img/artificer_bench.png', description: 'Advanced crafting station for creating complex items and components. Essential for high-level crafting and technological progression.' }
        );
        
        // Ores & Precious Minerals
        allAssets.push(
            { id: 'coal', name: 'Coal', image: 'assets/img/coal.png', description: 'Common ore used as fuel for smelting and crafting. Found throughout the underground in moderate quantities.' },
            { id: 'iron', name: 'Iron', image: 'assets/img/iron.png', description: 'Versatile metal ore used for tools, weapons, and armor. Essential intermediate material for progression.' },
            { id: 'gold', name: 'Gold', image: 'assets/img/gold.png', description: 'Precious metal ore used for advanced crafting and decorative items. Rarer than iron but essential for high-tier equipment.' },
            { id: 'diamond', name: 'Diamond', image: 'assets/img/diamond.png', description: 'Extremely valuable gemstone used for top-tier tools and equipment. Found deep underground in rare deposits.' },
            { id: 'runestone', name: 'Runestone', image: 'assets/img/runestone.png', description: 'Mysterious stone block inscribed with ancient runes. Used for magical crafting and dimensional technology.' },
            { id: 'veinstone', name: 'Veinstone', image: 'assets/img/veinstone.png', description: 'Specialized ore containing concentrated mineral veins. Used in advanced metallurgy and rare material extraction.' }
        );
        
        // Continuist Lore Blocks
        allAssets.push(
            { id: 'resonance_core', name: 'Resonance Core', image: 'assets/img/resonance_core.png', description: 'Advanced dimensional technology component that stabilizes resonance fields. Essential for gate construction and transit systems.' },
            { id: 'waybound_frame', name: 'Waybound Frame', image: 'assets/img/waybound_frame.png', description: 'Structural frame that maintains dimensional stability. Used in gate construction and boundary enforcement.' },
            { id: 'transit_regulator', name: 'Transit Regulator', image: 'assets/img/transit_regulator.png', description: 'Control mechanism for managing dimensional transit flow. Essential for safe passage through gates and portals.' },
            { id: 'veilglass', name: 'Veilglass', image: 'assets/img/veilglass.png', description: 'Specialized glass that can exist within dimensional boundaries. Used for observation and containment in high-dimensional areas.' },
            { id: 'nullrock', name: 'Nullrock', image: 'assets/img/nullrock.png', description: 'The ultimate limiter block that represents refusal made physical. Found at the bottom of the world (y==0) and cannot be broken in Survival mode.' }
        );
        
        // Player Texture
        allAssets.push(
            { id: 'player_default', name: 'Player Default', image: 'assets/img/player_default.png', description: 'Default AND offline texture for the player model. This is what all players default to if not adding a skin and can be locally changed for LAN/offline play.' }
        );
        
        // Legacy Archive: Experimental Designs
        allAssets.push(
            { id: 'artificer_bench_v1', name: 'Artificer Bench V1', image: 'assets/img/legacy/artificer_bench_V1.png', description: 'Version 1 iteration of the Artificer Bench featuring early experimental design concepts and basic functionality.' },
            { id: 'door_v1', name: 'Door V1', image: 'assets/img/legacy/door_V1.png', description: 'Version 1 door design with basic mechanics and early aesthetic concepts. Pre-dates current door systems.' },
            { id: 'patchy_grass', name: 'Patchy Grass', image: 'assets/img/legacy/grass_patchy.png', description: 'Experimental grass texture with variable surface patterns. Abandoned in favor of uniform grass for dimensional stability.' }
        );
        
        // Legacy Archive: The HD Era (V1)
        allAssets.push(
            { id: 'hd_dirt', name: 'HD Dirt', image: 'assets/img/legacy/hd/dirt_HD.png', description: 'High-definition version of dirt texture from early HD experiments. Features increased detail and resolution.' },
            { id: 'hd_grass', name: 'HD Grass', image: 'assets/img/legacy/hd/grass_HD.png', description: 'High-definition grass texture with enhanced detail and color depth. Part of early HD texture experiments.' },
            { id: 'hd_stone', name: 'HD Stone', image: 'assets/img/legacy/hd/stone_HD.png', description: 'High-definition stone texture with increased surface detail and realism. Experimental HD version.' },
            { id: 'hd_sand', name: 'HD Sand', image: 'assets/img/legacy/hd/sand_HD.png', description: 'High-definition sand texture with enhanced granular detail and color variation. Part of HD texture experiments.' },
            { id: 'hd_water', name: 'HD Water', image: 'assets/img/legacy/hd/water_HD.png', description: 'High-definition water texture with enhanced fluid dynamics and transparency. Experimental HD water system.' },
            { id: 'hd_wood', name: 'HD Wood', image: 'assets/img/legacy/hd/wood_HD.png', description: 'High-definition wood texture with enhanced grain detail and wood texture. Part of early HD experiments.' },
            { id: 'hd_leaves', name: 'HD Leaves', image: 'assets/img/legacy/hd/leaves_HD.png', description: 'High-definition leaves texture with enhanced detail and natural variation. Experimental HD foliage system.' }
        );
        
        // Legacy Archive: V9
        allAssets.push(
            { id: 'v9_coal', name: 'V9 Coal', image: 'assets/img/legacy/v9/coal_V9.png', description: 'Version 9 iteration of coal texture with refined visual design and improved material representation.' },
            { id: 'v9_glass', name: 'V9 Glass', image: 'assets/img/legacy/v9/glass_V9.png', description: 'Version 9 glass texture with enhanced transparency effects and refined visual clarity.' },
            { id: 'v9_gold', name: 'V9 Gold', image: 'assets/img/legacy/v9/gold_V9.png', description: 'Version 9 gold texture with improved metallic appearance and enhanced visual appeal.' },
            { id: 'v9_iron', name: 'V9 Iron', image: 'assets/img/legacy/v9/iron_V9.png', description: 'Version 9 iron texture with refined metallic properties and improved material representation.' },
            { id: 'v9_leaves', name: 'V9 Leaves', image: 'assets/img/legacy/v9/leaves_V9.png', description: 'Version 9 iteration of leaves texture with improved organic patterns and enhanced natural appearance.' },
            { id: 'v9_veilglass', name: 'V9 Veilglass', image: 'assets/img/legacy/v9/veilglass_V9.png', description: 'Version 9 iteration of veilglass with early dimensional material experiments and visual refinements.' }
        );
        
        return allAssets;
    }
    
    // Debug function to log all blocks
    debugAllAssets() {
        const allAssets = this.getAllAssets();
        console.log('=== ALL BLOCKS IN NAVIGATION ===');
        allAssets.forEach((asset, index) => {
            console.log(`${index}: ${asset.name} (${asset.id})`);
        });
        console.log(`Total: ${allAssets.length} blocks`);
        console.log('============================');
    }

    showAssetPopup(name, image, assetId, viewType = '2D', description = '') {
        console.log('showAssetPopup called with:', { name, image, assetId, viewType, description });
        // Update URL with asset and type parameters
        const url = new URL(window.location);
        url.searchParams.set('asset', assetId);
        url.searchParams.set('type', viewType);
        window.history.pushState({}, '', url);
        
        // Store current asset for arrow navigation
        this.currentAssetId = assetId;
        this.currentAssetIndex = this.getAllAssets().findIndex(asset => asset.id === assetId);
        
        // Use the original modal system with description
        console.log('Calling openModal with:', image, name, description, assetId);
        openModal(image, name, description, assetId);
        
        // Set the correct view mode immediately (no delay)
        if (viewType === '3D') {
            setViewMode('3D');
        }
        
        // Update arrow visibility after modal opens
        setTimeout(() => {
            this.updateArrowVisibility();
        }, 100);
    }

    navigateModal(direction) {
        const allAssets = this.getAllAssets();
        
        if (this.currentAssetIndex === undefined || this.currentAssetIndex === -1) {
            this.currentAssetIndex = 0;
        }
        
        // Calculate new index
        let newIndex = this.currentAssetIndex + direction;
        if (newIndex < 0) newIndex = allAssets.length - 1;
        if (newIndex >= allAssets.length) newIndex = 0;
        
        // Update current index
        this.currentAssetIndex = newIndex;
        
        // Get new asset
        const newAsset = allAssets[newIndex];
        
        // Update modal content
        const modalImg = document.getElementById('modalImg');
        const modalName = document.getElementById('modalName');
        const modalDesc = document.getElementById('modalDesc');
        
        if (modalImg) modalImg.src = newAsset.image;
        if (modalName) modalName.textContent = newAsset.name;
        if (modalDesc) modalDesc.textContent = newAsset.description || '';
        
        // Update 3D texture if in 3D mode
        if (document.getElementById('three-container').style.display !== 'none') {
            update3DTexture(newAsset.image);
        }
        
        // Update URL
        const url = new URL(window.location);
        url.searchParams.set('asset', newAsset.id);
        window.history.pushState({}, '', url);
        
        // Store for gallery
        this.currentAssetId = newAsset.id;
        currentAssetId = newAsset.id;
        
        // Update arrow visibility
        this.updateArrowVisibility();
    }

    updateArrowVisibility() {
        const leftArrow = document.querySelector('.modal-arrow-left');
        const rightArrow = document.querySelector('.modal-arrow-right');
        const allAssets = this.getAllAssets();
        
        // Debug logging to verify all blocks
        console.log(`Total blocks: ${allAssets.length}, Current index: ${this.currentAssetIndex}, Current block: ${allAssets[this.currentAssetIndex]?.name}`);
        
        // NEVER show left arrow at start (index 0) - ALWAYS HIDE
        if (leftArrow) {
            if (this.currentAssetIndex <= 0) {
                leftArrow.style.display = 'none';
                console.log('Left arrow hidden - at start or invalid index');
            } else {
                leftArrow.style.display = 'flex';
                console.log('Left arrow shown - not at start');
            }
        }
        
        // NEVER show right arrow at end (last index) - ALWAYS HIDE
        if (rightArrow) {
            if (this.currentAssetIndex >= allAssets.length - 1) {
                rightArrow.style.display = 'none';
                console.log('Right arrow hidden - at end or beyond');
            } else {
                rightArrow.style.display = 'flex';
                console.log('Right arrow shown - not at end');
            }
        }
    }

    populateGalleries() {
        // Clear all galleries first to prevent duplicates
        const galleryIds = ['nat-gallery', 'util-gallery', 'ore-gallery', 'lore-gallery', 'player-gallery', 'legacy-gallery', 'hd-gallery', 'v9-gallery'];
        
        galleryIds.forEach(id => {
            const gallery = document.getElementById(id);
            if (gallery) {
                gallery.innerHTML = ''; // Clear existing content
            }
        });

        // Natural Resources Gallery - Latest Textures
        const natGallery = document.getElementById('nat-gallery');
        if (natGallery) {
            const naturalBlocks = [
                { name: 'Dirt', image: 'assets/img/dirt.png' },
                { name: 'Grass', image: 'assets/img/grass.png' },
                { name: 'Stone', image: 'assets/img/stone.png' },
                { name: 'Sand', image: 'assets/img/sand.png' },
                { name: 'Water', image: 'assets/img/water.png' },
                { name: 'Wood', image: 'assets/img/wood.png' },
                { name: 'Leaves', image: 'assets/img/leaves.png' },
                { name: 'Gravel', image: 'assets/img/gravel.png' }
            ];
            this.createGalleryItems(natGallery, naturalBlocks);
        }

        // Construction & Utilities Gallery - Latest Textures
        const utilGallery = document.getElementById('util-gallery');
        if (utilGallery) {
            const utilBlocks = [
                { name: 'Chest', image: 'assets/img/chest.png' },
                { name: 'Glass', image: 'assets/img/glass.png' },
                { name: 'Plank', image: 'assets/img/plank.png' },
                { name: 'Artificer Bench', image: 'assets/img/artificer_bench.png' }
            ];
            this.createGalleryItems(utilGallery, utilBlocks);
        }

        // Ores & Precious Minerals Gallery - Latest Textures
        const oreGallery = document.getElementById('ore-gallery');
        if (oreGallery) {
            const oreBlocks = [
                { name: 'Coal', image: 'assets/img/coal.png' },
                { name: 'Iron', image: 'assets/img/iron.png' },
                { name: 'Gold', image: 'assets/img/gold.png' },
                { name: 'Diamond', image: 'assets/img/diamond.png' },
                { name: 'Runestone', image: 'assets/img/runestone.png' },
                { name: 'Veinstone', image: 'assets/img/veinstone.png' }
            ];
            this.createGalleryItems(oreGallery, oreBlocks);
        }

        // Continuist Lore Blocks Gallery - Latest Textures
        const loreGallery = document.getElementById('lore-gallery');
        if (loreGallery) {
            const loreBlocks = [
                { name: 'Resonance Core', image: 'assets/img/resonance_core.png' },
                { name: 'Waybound Frame', image: 'assets/img/waybound_frame.png' },
                { name: 'Transit Regulator', image: 'assets/img/transit_regulator.png' },
                { name: 'Veilglass', image: 'assets/img/veilglass.png' },
                { name: 'Nullrock', image: 'assets/img/nullrock.png' }
            ];
            this.createGalleryItems(loreGallery, loreBlocks);
        }

        // Player Texture Gallery
        const playerGallery = document.getElementById('player-gallery');
        if (playerGallery) {
            const playerBlocks = [
                { name: 'Player Default', image: 'assets/img/player_default.png', description: 'Default AND offline texture for the player model. This is what all players default to if not adding a skin and can be locally changed for LAN/offline play.' }
            ];
            this.createGalleryItems(playerGallery, playerBlocks);
        }

        // Legacy Archive: Experimental Designs
        const legacyGallery = document.getElementById('legacy-gallery');
        if (legacyGallery) {
            const legacyBlocks = [
                { name: 'Artificer Bench V1', image: 'assets/img/legacy/artificer_bench_V1.png' },
                { name: 'Door V1', image: 'assets/img/legacy/door_V1.png' },
                { name: 'Patchy Grass', image: 'assets/img/legacy/grass_patchy.png' }
            ];
            this.createGalleryItems(legacyGallery, legacyBlocks);
        }

        // Legacy Archive: The HD Era (V1) - Fixed Naming
        const hdGallery = document.getElementById('hd-gallery');
        if (hdGallery) {
            const hdBlocks = [
                { name: 'HD Dirt', image: 'assets/img/legacy/hd/dirt_HD.png' },
                { name: 'HD Grass', image: 'assets/img/legacy/hd/grass_HD.png' },
                { name: 'HD Stone', image: 'assets/img/legacy/hd/stone_HD.png' },
                { name: 'HD Sand', image: 'assets/img/legacy/hd/sand_HD.png' },
                { name: 'HD Water', image: 'assets/img/legacy/hd/water_HD.png' },
                { name: 'HD Wood', image: 'assets/img/legacy/hd/wood_HD.png' },
                { name: 'HD Leaves', image: 'assets/img/legacy/hd/leaves_HD.png' }
            ];
            this.createGalleryItems(hdGallery, hdBlocks);
        }

        // Legacy Archive: V9 - Fixed Naming
        const v9Gallery = document.getElementById('v9-gallery');
        if (v9Gallery) {
            const v9Blocks = [
                { name: 'V9 Coal', image: 'assets/img/legacy/v9/coal_V9.png' },
                { name: 'V9 Glass', image: 'assets/img/legacy/v9/glass_V9.png' },
                { name: 'V9 Gold', image: 'assets/img/legacy/v9/gold_V9.png' },
                { name: 'V9 Iron', image: 'assets/img/legacy/v9/iron_V9.png' },
                { name: 'V9 Leaves', image: 'assets/img/legacy/v9/leaves_V9.png' },
                { name: 'V9 Veilglass', image: 'assets/img/legacy/v9/veilglass_V9.png' },
                { name: 'V9 Patchy Grass', image: 'assets/img/legacy/v9/grass_patchy_V9.png' }
            ];
            this.createGalleryItems(v9Gallery, v9Blocks);
        }
    }

    createGalleryItems(gallery, blocks) {
        blocks.forEach(block => {
            const item = document.createElement('div');
            item.className = 'block-item';
            
            // Create asset ID from name for URL routing
            const assetId = block.name.toLowerCase().replace(/\s+/g, '_').replace(/[^\w_]/g, '');
            
            // Add description if available
            const description = block.description ? `<p class="block-description">${block.description}</p>` : '';
            
            item.innerHTML = `
                <img src="${block.image}" alt="${block.name}" class="block-image" onerror="this.src='assets/img/missing.png'" 
                     data-name="${block.name}" 
                     data-image="${block.image}" 
                     data-asset-id="${assetId}" 
                     data-description="${(block.description || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;')}"
                     onclick="showAssetPopupWithPersistence(this.dataset.name, this.dataset.image, this.dataset.assetId, this.dataset.description)">
                <div class="block-info">
                    <h4>${block.name}</h4>
                    ${description}
                    <button class="download-btn" onclick="downloadTexture('${block.name}', '${block.image}')">
                        <i class="fas fa-download"></i> Download
                    </button>
                </div>
            `;
            gallery.appendChild(item);
        });
    }
}

// Global functions for HTML onclick handlers
function showAssetPopup(name, image, assetId) {
    const gallery = new TextureGallery();
    gallery.showAssetPopup(name, image, assetId, '2D'); // Default to 2D view
}

function showAssetPopupWithPersistence(name, image, assetId, description = '') {
    console.log('showAssetPopupWithPersistence called with:', { name, image, assetId, description });
    // Find the asset by name to get the correct description if not provided
    if (!description || description === '') {
        const gallery = new TextureGallery();
        const asset = gallery.findAssetByName(name.toLowerCase().replace(/\s+/g, '_'));
        if (asset && asset.description) {
            description = asset.description;
            console.log('Found description from findAssetByName:', description);
        }
    }
    // Check URL for saved view mode, default to 2D
    const urlParams = new URLSearchParams(window.location.search);
    const savedView = urlParams.get('type') || '2D';
    
    const gallery = new TextureGallery();
    gallery.showAssetPopup(name, image, assetId, savedView, description);
}

function closeAssetModal() {
    // Use the original modal close function
    closeModal();
    
    // Reset URL to ?asset= (blank) for the assets tab, clear type
    const url = new URL(window.location);
    url.searchParams.set('asset', '');
    url.searchParams.delete('type');
    window.history.pushState({}, '', url);
}

// Download function
function downloadTexture(name, imagePath) {
    const link = document.createElement('a');
    link.href = imagePath;
    link.download = `${name}.png`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Initialize gallery when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new TextureGallery();
});

// Carousel functionality
let currentCarouselIndex = -1;
let carouselBlocks = [];
let isCarouselActive = false;

function initializeCarousel(currentAssetId) {
    // Prevent re-initialization if carousel is already active for this asset
    if (isCarouselActive && currentCarouselIndex >= 0 && 
        carouselBlocks[currentCarouselIndex] && 
        carouselBlocks[currentCarouselIndex].name.toLowerCase().replace(/\s+/g, '_') === currentAssetId) {
        updateCarouselNavigation(); // Just update navigation, don't reinitialize
        return;
    }
    
    // Get all blocks in the correct order (left-to-right, then next line)
    const gallery = new TextureGallery();
    
    // Extract blocks in the order they appear in the gallery
    carouselBlocks = [];
    
    // Natural Resources
    const naturalBlocks = ['dirt', 'grass', 'stone', 'sand', 'water', 'wood', 'leaves', 'gravel'];
    naturalBlocks.forEach(blockName => {
        const asset = gallery.findAssetByName(blockName);
        if (asset) carouselBlocks.push(asset);
    });
    
    // Construction & Utilities
    const constructionBlocks = ['chest', 'glass', 'plank', 'artificer_bench'];
    constructionBlocks.forEach(blockName => {
        const asset = gallery.findAssetByName(blockName);
        if (asset) carouselBlocks.push(asset);
    });
    
    // Ores & Precious Minerals
    const oreBlocks = ['coal', 'iron', 'gold', 'diamond', 'runestone', 'veinstone'];
    oreBlocks.forEach(blockName => {
        const asset = gallery.findAssetByName(blockName);
        if (asset) carouselBlocks.push(asset);
    });
    
    // Lore Blocks
    const loreBlocks = ['resonance_core', 'waybound_frame', 'transit_regulator', 'waygate_plinth', 'waygate_rune', 'evergate_core', 'veilglass', 'nullrock'];
    loreBlocks.forEach(blockName => {
        const asset = gallery.findAssetByName(blockName);
        if (asset) carouselBlocks.push(asset);
    });
    
    // Player
    const playerBlocks = ['player_default'];
    playerBlocks.forEach(blockName => {
        const asset = gallery.findAssetByName(blockName);
        if (asset) carouselBlocks.push(asset);
    });
    
    // Find current index
    currentCarouselIndex = carouselBlocks.findIndex(block => 
        block.name.toLowerCase().replace(/\s+/g, '_') === currentAssetId
    );
    
    isCarouselActive = true;
    updateCarouselNavigation();
}

function updateCarouselNavigation() {
    const prevBtn = document.getElementById('carouselPrev');
    const nextBtn = document.getElementById('carouselNext');
    
    // Clear existing content
    prevBtn.innerHTML = '';
    nextBtn.innerHTML = '';
    
    // Update previous button
    if (currentCarouselIndex > 0) {
        const prevBlock = carouselBlocks[currentCarouselIndex - 1];
        create3DThumbnail(prevBtn, prevBlock);
        prevBtn.classList.remove('hidden');
    } else {
        prevBtn.classList.add('hidden');
    }
    
    // Update next button
    if (currentCarouselIndex < carouselBlocks.length - 1) {
        const nextBlock = carouselBlocks[currentCarouselIndex + 1];
        create3DThumbnail(nextBtn, nextBlock);
        nextBtn.classList.remove('hidden');
    } else {
        nextBtn.classList.add('hidden');
    }
}

function create3DThumbnail(button, block) {
    const urlParams = new URLSearchParams(window.location.search);
    const currentView = urlParams.get('type') || '2D';
    
    // Always use 2D thumbnails to avoid WebGL context overload
    const img = document.createElement('img');
    img.src = block.image;
    img.alt = block.name;
    img.className = 'carousel-thumb';
    
    // Add subtle 3D indicator in 3D mode (no borders)
    if (currentView === '3D') {
        img.style.filter = 'hue-rotate(180deg)';
        img.style.opacity = '0.9';
    }
    
    button.appendChild(img);
}

function navigateCarousel(direction) {
    console.log('🎬 CAROUSEL NAVIGATION START');
    console.log('Direction:', direction > 0 ? 'RIGHT' : 'LEFT');
    console.log('Current Index:', currentCarouselIndex);
    
    const newIndex = currentCarouselIndex + direction;
    
    if (newIndex < 0 || newIndex >= carouselBlocks.length) {
        console.log('❌ CANNOT NAVIGATE - Out of bounds');
        return; // Can't navigate beyond bounds
    }
    
    const block = carouselBlocks[newIndex];
    const assetId = block.name.toLowerCase().replace(/\s+/g, '_');
    
    console.log('📍 New Block:', block.name);
    console.log('📍 New Asset ID:', assetId);
    
    // Get current view mode
    const urlParams = new URLSearchParams(window.location.search);
    const currentView = urlParams.get('type') || '2D';
    
    console.log('👁️ Current View Mode:', currentView);
    
    // Get the current visible element (2D image or 3D container)
    const modalImg = document.getElementById('modalImg');
    const threeContainer = document.getElementById('three-container');
    const currentElement = currentView === '3D' ? threeContainer : modalImg;
    
    console.log('🎯 Current Element:', currentView === '3D' ? '3D Container' : '2D Image');
    
    // Clear any existing animation classes
    console.log('🧹 Clearing existing animation classes');
    currentElement.classList.remove('sliding-out-left', 'sliding-out-right', 'sliding-in-left', 'sliding-in-right');
    
    // Add slide-out animation to current element
    const slideOutClass = direction > 0 ? 'sliding-out-right' : 'sliding-out-left';
    console.log('📤 Adding slide-out class:', slideOutClass);
    currentElement.classList.add(slideOutClass);
    
    // Update carousel index FIRST to prevent infinite loop
    currentCarouselIndex = newIndex;
    console.log('📊 Updated carousel index to:', currentCarouselIndex);
    
    // Navigate to new block directly without re-initializing carousel
    const url = new URL(window.location);
    url.searchParams.set('asset', assetId);
    url.searchParams.set('type', currentView);
    window.history.pushState({}, '', url);
    
    console.log('🔗 URL updated:', url.toString());
    
    // Update modal content (static, no animation)
    console.log('📝 Updating modal content');
    document.getElementById('modalName').innerText = block.name;
    // Ensure description is properly retrieved
    const description = block.description || '';
    console.log('📄 Block Description:', description);
    document.getElementById('modalDesc').innerText = description;
    currentAssetId = assetId;
    
    // Update download button
    const downloadBtn = document.getElementById('modalDownload');
    downloadBtn.onclick = () => downloadTexture(block.name, block.image);
    
    // Update image source (needed for both 2D and 3D)
    console.log('🖼️ Updating image source to:', block.image);
    modalImg.src = block.image;
    
    // Update 3D texture if in 3D mode
    if (currentView === '3D') {
        console.log('🎮 Updating 3D texture');
        setTimeout(() => {
            update3DTexture(block.image);
            // Keep 3D model interactive - don't disable controls
        }, 300); // Delay for smooth transition
    }
    
    // Set view mode (this handles showing/hiding 2D/3D elements)
    if (currentView === '3D') {
        setViewMode('3D');
    }
    
    // Update carousel navigation
    console.log('🔄 Updating carousel navigation');
    updateCarouselNavigation();
    
    // After slide-out animation starts, prepare slide-in animation
    setTimeout(() => {
        console.log('⏰ Starting slide-in animation');
        // Remove slide-out class and add slide-in class to the appropriate element
        const targetElement = currentView === '3D' ? threeContainer : modalImg;
        targetElement.classList.remove('sliding-out-left', 'sliding-out-right');
        
        const slideInClass = direction > 0 ? 'sliding-in-right' : 'sliding-in-left';
        console.log('📥 Adding slide-in class:', slideInClass);
        targetElement.classList.add(slideInClass);
        
        // Remove animation class after animation completes
        setTimeout(() => {
            console.log('✅ Animation complete - removing classes');
            targetElement.classList.remove('sliding-in-left', 'sliding-in-right');
            console.log('🎬 CAROUSEL NAVIGATION COMPLETE');
        }, 1200);
    }, 50);
}
