import SearchHubService from './src/services/searchHubService.js';

// Simulamos fetch si no estamos en browser (Node.js < 18 podría no tenerlo, pero asumiremos que lo tiene)
async function test() {
  console.log("Iniciando prueba de Search Hub...");
  try {
    // Tacrolimus and Pregnancy is the requested example strategy
    const result = await SearchHubService.executeMultiSourceSearch("(tacrolimus) AND pregnancy", 2);
    
    console.log("\n--- RESULTADOS DE EJECUCIÓN ---");
    console.log(`Ejecuciones almacenadas (Snapshots): ${result.executionSnapshots.length}`);
    result.executionSnapshots.forEach(snap => {
      console.log(`- ${snap.provider}: ${snap.articles.length} artículos encontrados`);
    });

    console.log("\n--- REPOSITORIO CENTRAL ---");
    console.log(`Total Artículos Únicos (Deduplicados): ${result.unifiedArticles.length}`);
    
    // Imprimir el primero para ver el formato
    if (result.unifiedArticles.length > 0) {
      console.log("\nEjemplo del primer artículo normalizado:");
      const example = result.unifiedArticles[0];
      console.log(`  Source(s): ${example.sources.join(', ')}`);
      console.log(`  PMID: ${example.pmid || 'N/A'}`);
      console.log(`  DOI: ${example.doi || 'N/A'}`);
      console.log(`  Title: ${example.title?.substring(0, 50)}...`);
      console.log(`  URL: ${example.url || 'N/A'}`);
    }

  } catch (error) {
    console.error("Error en la prueba:", error);
  }
}

test();
