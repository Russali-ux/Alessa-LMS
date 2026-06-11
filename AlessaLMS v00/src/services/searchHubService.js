import PubMedService from './pubmedService.js';
import SpringerService from './springerService.js';

/**
 * Search Hub Service
 * Orquesta la búsqueda en múltiples proveedores (PubMed, Springer, etc.),
 * genera los snapshots de ejecución y realiza la deduplicación para el repositorio central.
 */
class SearchHubService {
  /**
   * Ejecuta la búsqueda en múltiples proveedores y unifica los resultados.
   * @param {string} strategyQuery La estrategia de búsqueda (ej. "(tacrolimus) AND pregnancy")
   * @param {number} maxResultsPerProvider Límite por proveedor
   * @returns {object} { executionSnapshots, unifiedArticles }
   */
  static async executeMultiSourceSearch(strategyQuery, maxResultsPerProvider = 100) {
    const results = [];
    
    // 1. PubMed Execution
    try {
      console.log(`Iniciando búsqueda en PubMed para: ${strategyQuery}`);
      const pubmedResults = await PubMedService.executeFullSearch(strategyQuery, maxResultsPerProvider);
      results.push({
        provider: 'PUBMED',
        count: pubmedResults.count,
        articles: pubmedResults.articles
      });
    } catch (e) {
      console.error("Error en PubMed:", e);
    }
    
    // 2. Springer Execution
    try {
      console.log(`Iniciando búsqueda en Springer para: ${strategyQuery}`);
      const springerResults = await SpringerService.executeFullSearch(strategyQuery, maxResultsPerProvider);
      results.push({
        provider: 'SPRINGER',
        count: springerResults.count,
        articles: springerResults.articles
      });
    } catch (e) {
      console.error("Error en Springer:", e);
    }

    // Aplanar todos los artículos encontrados
    const allArticlesRaw = results.map(r => r.articles).flat();

    // 3. Deduplicación por DOI para el repositorio central
    const unifiedArticles = this.deduplicateArticles(allArticlesRaw);

    return {
      executionSnapshots: results, // Para Level 3: Search Snapshots (Mantienen su external_id original)
      unifiedArticles: unifiedArticles // Para Level 4 y 5: Repositorio central deduplicado
    };
  }

  /**
   * Consolida artículos deduplicando por DOI.
   * Si hay coincidencias, fusiona la información relevante.
   */
  static deduplicateArticles(articles) {
    const deduplicated = new Map();
    const articlesWithoutDoi = [];

    articles.forEach(article => {
      if (article.doi) {
        // Normalizar DOI para la comparación (minúsculas, sin espacios)
        const doiKey = article.doi.trim().toLowerCase();
        
        if (deduplicated.has(doiKey)) {
          // Fusionar fuentes si ya existe el DOI
          const existing = deduplicated.get(doiKey);
          
          // Si el nuevo artículo es de PubMed, aseguramos guardar el PMID
          if (article.source === 'PUBMED' && article.external_id) {
             existing.pmid = article.external_id; 
          }
          
          // Agregar la fuente si no estaba ya listada
          if (!existing.sources) {
            existing.sources = [existing.source];
          }
          if (!existing.sources.includes(article.source)) {
            existing.sources.push(article.source);
          }
          
          // Se podrían priorizar campos (ej. preferir abstract de PubMed sobre Springer, etc.)
          // Aquí conservamos el primero que llegó, típicamente PubMed.
        } else {
          // Nuevo artículo con DOI
          const newArt = { ...article, sources: [article.source] };
          if (article.source === 'PUBMED') {
            newArt.pmid = article.external_id;
          }
          deduplicated.set(doiKey, newArt);
        }
      } else {
        // Artículos sin DOI van directos, no se pueden deduplicar fácilmente por DOI
        const newArt = { ...article, sources: [article.source] };
        if (article.source === 'PUBMED') {
          newArt.pmid = article.external_id;
        }
        articlesWithoutDoi.push(newArt);
      }
    });

    return [...Array.from(deduplicated.values()), ...articlesWithoutDoi];
  }
}

export default SearchHubService;
