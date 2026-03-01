import { Client } from '@notionhq/client';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NOTION_KEY = process.env.NOTION_KEY;
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const notion = new Client({ auth: NOTION_KEY });

/**
 * Automates the fetching of heroes from Notion and generates their portraits.
 */
async function syncHeroBase() {
    console.log('🚀 Starting Hero Base Sync...');

    if (!NOTION_KEY || !NOTION_DATABASE_ID) {
        console.error('❌ Missing Notion credentials in .env');
        return;
    }

    try {
        // 1. Fetch "Pending" heroes from Notion
        const response = await notion.databases.query({
            database_id: NOTION_DATABASE_ID,
            filter: {
                property: 'Status',
                select: {
                    equals: 'Pending',
                },
            },
        });

        const pendingHeroes = response.results;
        console.log(`📦 Found ${pendingHeroes.length} pending heroes.`);

        const heroesJsonPath = path.resolve(__dirname, '../src/data/heroes.json');
        let currentHeroes = JSON.parse(fs.readFileSync(heroesJsonPath, 'utf8'));

        for (const page of pendingHeroes) {
            const props = page.properties;
            const name = props.Name.title[0]?.plain_text;
            const land = props.Land.select?.name;
            const bio = props.Bio.rich_text[0]?.plain_text;
            const traits = props.Traits.multi_select?.map(t => t.name);
            const landColor = props.LandColor?.color || '#d4a843';

            console.log(`✨ Processing ${name}...`);

            // 2. Generate Image (Portrait)
            // Note: This uses a placeholder logic for image generation API
            const imagePath = await generateHeroPortrait(name, land, traits);

            // 3. Update JSON
            const newHero = {
                name,
                title: props.Title.rich_text[0]?.plain_text || 'UGC Hero',
                land,
                landColor,
                focus: props.Focus.rich_text[0]?.plain_text || 'Learning Guide',
                img: `/assets/heroes/${path.basename(imagePath)}`,
                bio,
                traits,
            };

            currentHeroes.push(newHero);

            // 4. Update Status in Notion to "Synced"
            await notion.pages.update({
                page_id: page.id,
                properties: {
                    Status: {
                        select: { name: 'Synced' },
                    },
                },
            });

            console.log(`✅ ${name} synced successfully!`);
        }

        fs.writeFileSync(heroesJsonPath, JSON.stringify(currentHeroes, null, 4));
        console.log('🏆 All heroes synced and heroes.json updated.');

    } catch (error) {
        console.error('❌ Sync failed:', error.message);
    }
}

/**
 * Placeholder for Character Portrait Generation logic.
 */
async function generateHeroPortrait(name, land, traits) {
    const prompt = `A high-quality 3D Disney/Pixar style portrait of a hero named ${name} from the land of ${land}. Characteristics: ${traits.join(', ')}. Vibrant lighting, detailed textures, professional character design.`;

    console.log(`🎨 Generating portrait for ${name}...`);

    // In a real scenario, call DALL-E 3 or similar here:
    /*
    const response = await axios.post('https://api.openai.com/v1/images/generations', {
        prompt,
        n: 1,
        size: '1024x1024'
    }, { headers: { Authorization: `Bearer ${OPENAI_API_KEY}` } });
    const imageUrl = response.data.data[0].url;
    */

    // Placeholder: simulate saving a generated image
    const placeholderPath = path.resolve(__dirname, `../public/assets/heroes/${name.toLowerCase()}.jpg`);
    if (!fs.existsSync(path.dirname(placeholderPath))) {
        fs.mkdirSync(path.dirname(placeholderPath), { recursive: true });
    }

    // For now, we'll just log that we would save it
    console.log(`📸 Image would be saved to ${placeholderPath}`);
    return placeholderPath;
}

syncHeroBase();
