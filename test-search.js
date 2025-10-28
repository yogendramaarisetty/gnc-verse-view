// Simple test script to verify search functionality
const { InMemorySearchEngine } = require('./lib/services/in-memory-search-engine.ts');

// Mock song data for testing
const mockSongs = [
  {
    id: '1',
    title: 'దేవిన్ చావే',
    titleTransliteration: 'Deevinchave',
    artist: { name: 'Test Artist' },
    language: 'telugu'
  },
  {
    id: '2', 
    title: 'Amazing Grace',
    titleTransliteration: 'Amazing Grace',
    artist: { name: 'John Newton' },
    language: 'english'
  },
  {
    id: '3',
    title: 'ప్రార్థన',
    titleTransliteration: 'Praarthana',
    artist: { name: 'Worship Leader' },
    language: 'telugu'
  }
];

async function testSearch() {
  console.log('Testing ultra-fast search implementation...');
  
  const searchEngine = new InMemorySearchEngine();
  await searchEngine.initialize(mockSongs);
  
  // Test 1: Exact match on transliteration
  console.log('\n=== Test 1: Exact match "Deevinchave" ===');
  const results1 = searchEngine.search('Deevinchave');
  console.log(`Found ${results1.length} results:`);
  results1.forEach((result, i) => {
    console.log(`${i + 1}. ${result.song.titleTransliteration} (Score: ${result.score}, Type: ${result.matchType})`);
  });
  
  // Test 2: Partial match
  console.log('\n=== Test 2: Partial match "Deevin" ===');
  const results2 = searchEngine.search('Deevin');
  console.log(`Found ${results2.length} results:`);
  results2.forEach((result, i) => {
    console.log(`${i + 1}. ${result.song.titleTransliteration} (Score: ${result.score}, Type: ${result.matchType})`);
  });
  
  // Test 3: Fuzzy match
  console.log('\n=== Test 3: Fuzzy match "grace" ===');
  const results3 = searchEngine.search('grace');
  console.log(`Found ${results3.length} results:`);
  results3.forEach((result, i) => {
    console.log(`${i + 1}. ${result.song.titleTransliteration} (Score: ${result.score}, Type: ${result.matchType})`);
  });
  
  console.log('\n=== Search Engine Stats ===');
  console.log(searchEngine.getStats());
}

testSearch().catch(console.error);
