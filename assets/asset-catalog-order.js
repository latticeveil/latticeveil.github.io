// Assets page catalog order, documented exactly top-to-bottom as it should appear visually.
// Navigation and gallery rendering both read from this file so they cannot drift apart.
window.LATTICEVEIL_ASSET_CATALOG = {
    sections: [
        {
            title: 'Natural Resources',
            galleryId: 'nat-gallery',
            kind: 'current',
            assetIds: ['dirt', 'grass', 'stone', 'sand', 'water', 'wood', 'leaves', 'gravel']
        },
        {
            title: 'Construction & Utilities',
            galleryId: 'util-gallery',
            kind: 'current',
            assetIds: ['chest', 'glass', 'plank', 'artificer_bench']
        },
        {
            title: 'Continuist Lore Blocks',
            galleryId: 'lore-gallery',
            kind: 'current',
            assetIds: ['resonance_core', 'waybound_frame', 'transit_regulator', 'veilglass', 'nullrock']
        },
        {
            title: 'Ores & Precious Minerals',
            galleryId: 'ore-gallery',
            kind: 'current',
            assetIds: ['coal', 'iron', 'gold', 'diamond', 'runestone', 'veinstone']
        },
        {
            title: 'Player Textures',
            galleryId: 'player-gallery',
            kind: 'current',
            assetIds: ['player_default']
        },
        {
            title: 'Legacy Archive: Experimental Designs',
            galleryId: 'legacy-gallery',
            kind: 'legacy',
            assetIds: ['artificer_bench_v1', 'door_v1', 'patchy_grass']
        },
        {
            title: 'Legacy Archive: V9',
            galleryId: 'v9-gallery',
            kind: 'legacy',
            assetIds: ['v9_coal', 'v9_glass', 'v9_gold', 'v9_iron', 'v9_leaves', 'v9_veilglass']
        },
        {
            title: 'Legacy Archive: The HD Era (V1)',
            galleryId: 'hd-gallery',
            kind: 'legacy',
            assetIds: ['hd_dirt', 'hd_grass', 'hd_stone', 'hd_sand', 'hd_water', 'hd_wood', 'hd_leaves']
        }
    ]
};
