// Odyssey Chapter Discovery System
// Dynamically discovers and loads knot-XX.md files in numeric order

class OdysseyDiscovery {
    constructor() {
        this.discoveredKnots = [];
        this.baseUrl = 'chapters/odyssey/';
        this.isDiscovering = false;
    }

    // Discover available knots by probing for knot-XX.md files
    async discoverKnots() {
        if (this.isDiscovering) return this.discoveredKnots;
        
        this.isDiscovering = true;
        this.discoveredKnots = [];
        
        let knotNumber = 1;
        while (true) {
            const filename = `knot-${knotNumber.toString().padStart(2, '0')}.md`;
            const url = `${this.baseUrl}${filename}`;
            
            try {
                const response = await fetch(url, { method: 'HEAD' });
                if (response.ok) {
                    this.discoveredKnots.push({
                        number: knotNumber,
                        filename: filename,
                        url: url,
                        title: null // Will be loaded when prose is fetched
                    });
                    knotNumber++;
                } else {
                    // Stop at first missing knot (require contiguous numbering)
                    break;
                }
            } catch (error) {
                // Stop at first error (require contiguous numbering)
                break;
            }
        }
        
        this.isDiscovering = false;
        return this.discoveredKnots;
    }

    // Extract title from markdown content (first heading)
    extractTitleFromMarkdown(markdown) {
        const lines = markdown.split('\n');
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('#')) {
                // Remove the # and any "Knot NN:" prefix
                let title = trimmed.replace(/^#+\s*/, '').trim();
                // Remove "Knot NN:" or "KNOT NN:" prefix if present
                title = title.replace(/^Knot\s+\d+:\s*/i, '').replace(/^KNOT\s+\d+:\s*/, '');
                return title;
            }
        }
        return null;
    }

    // Load markdown content and extract title
    async loadKnotContent(knotNumber) {
        const knot = this.discoveredKnots.find(k => k.number === knotNumber);
        if (!knot) return null;

        try {
            const response = await fetch(knot.url);
            if (!response.ok) throw new Error(`Failed to load ${knot.filename}`);
            
            const markdown = await response.text();
            const title = this.extractTitleFromMarkdown(markdown);
            
            // Update the knot's title
            if (title) {
                knot.title = title;
            }
            
            return {
                markdown: markdown,
                title: title
            };
        } catch (error) {
            console.error(`Error loading knot ${knotNumber}:`, error);
            return null;
        }
    }

    // Get knot title, loading content if necessary
    async getKnotTitle(knotNumber) {
        const knot = this.discoveredKnots.find(k => k.number === knotNumber);
        if (!knot) return null;

        if (knot.title) return knot.title;

        // Load content to extract title
        const content = await this.loadKnotContent(knotNumber);
        return content ? content.title : null;
    }

    // Get formatted knot label (e.g., "KNOT 01")
    getKnotLabel(knotNumber) {
        return `KNOT ${knotNumber.toString().padStart(2, '0')}`;
    }

    // Get all discovered knots
    getDiscoveredKnots() {
        return this.discoveredKnots;
    }

    // Get the highest knot number discovered
    getHighestKnotNumber() {
        if (this.discoveredKnots.length === 0) return 0;
        return this.discoveredKnots[this.discoveredKnots.length - 1].number;
    }
}

// Global instance
window.odysseyDiscovery = new OdysseyDiscovery();
