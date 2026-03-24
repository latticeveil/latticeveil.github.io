// Texture and Model Gallery System
class TextureGallery {
    constructor() {
        this.init();
    }

    init() {
        this.populateGalleries();
    }

    populateGalleries() {
        // Natural Resources Gallery
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

        // Construction & Utilities Gallery
        const utilGallery = document.getElementById('util-gallery');
        if (utilGallery) {
            const utilBlocks = [
                { name: 'Crafting Table', image: 'assets/img/crafting_table.png' },
                { name: 'Chest', image: 'assets/img/chest.png' },
                { name: 'Door', image: 'assets/img/door.png' },
                { name: 'Glass', image: 'assets/img/glass.png' },
                { name: 'Plank', image: 'assets/img/plank.png' },
                { name: 'Artificer Bench', image: 'assets/img/artificer_bench.png' }
            ];
            this.createGalleryItems(utilGallery, utilBlocks);
        }

        // Ores & Precious Minerals Gallery
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

        // Continuist Lore Blocks Gallery
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

        // Legacy Archive: Experimental Designs
        const legacyGallery = document.getElementById('legacy-gallery');
        if (legacyGallery) {
            const legacyBlocks = [
                { name: 'Patchy Grass', image: 'assets/img/legacy/grass_patchy.png' }
            ];
            this.createGalleryItems(legacyGallery, legacyBlocks);
        }

        // Legacy Archive: The HD Era (V1)
        const hdGallery = document.getElementById('hd-gallery');
        if (hdGallery) {
            const hdBlocks = [
                { name: 'HD Dirt', image: 'assets/img/legacy/hd/dirt.png' },
                { name: 'HD Grass', image: 'assets/img/legacy/hd/grass.png' },
                { name: 'HD Stone', image: 'assets/img/legacy/hd/stone.png' },
                { name: 'HD Sand', image: 'assets/img/legacy/hd/sand.png' },
                { name: 'HD Water', image: 'assets/img/legacy/hd/water.png' },
                { name: 'HD Wood', image: 'assets/img/legacy/hd/wood.png' },
                { name: 'HD Leaves', image: 'assets/img/legacy/hd/leaves.png' }
            ];
            this.createGalleryItems(hdGallery, hdBlocks);
        }
    }

    createGalleryItems(gallery, blocks) {
        blocks.forEach(block => {
            const item = document.createElement('div');
            item.className = 'block-item';
            item.innerHTML = `
                <img src="${block.image}" alt="${block.name}" class="block-image" onerror="this.src='assets/img/missing.png'">
                <div class="block-info">
                    <h4>${block.name}</h4>
                    <button class="download-btn" onclick="downloadTexture('${block.name}', '${block.image}')">
                        <i class="fas fa-download"></i> Download
                    </button>
                </div>
            `;
            gallery.appendChild(item);
        });
    }
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
