/**
 * Springer Service Module
 * Handles API calls to Springer Open Access API.
 */
class SpringerService {
  /**
   * Fetch articles from Springer Nature Open Access API
   * @param {string} query Search term
   * @param {number} limit Max results to fetch
   * @param {string} apiKey Springer API Key
   * @returns {object} { count, articles }
   */
  static async executeFullSearch(query, limit = 100, apiKey = '') {
    // Attempt to use env var if apiKey not provided (Vite specific)
    const key = apiKey || (import.meta.env && import.meta.env.VITE_SPRINGER_API_KEY) || 'YOUR_SPRINGER_API_KEY';
    
    let allArticles = [];
    let start = 1;
    const pageLength = 100;
    let totalCount = 0;
    
    try {
      while (allArticles.length < limit) {
        // Calculate how many we actually need in this page (to not exceed limit or pageLength)
        const toFetch = Math.min(pageLength, limit - allArticles.length);
        
        const url = `https://api.springernature.com/openaccess/json?api_key=${key}&q=${encodeURIComponent(query)}&p=${toFetch}&s=${start}`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Springer API HTTP error! status: ${response.status}`);
        
        const data = await response.json();
        
        // Extract total count on first request
        if (start === 1 && data.result && data.result.length > 0) {
          totalCount = parseInt(data.result[0].total, 10);
        }
        
        if (!data.records || data.records.length === 0) {
          break; // No more records
        }
        
        // Normalize records
        const normalizedRecords = data.records.map(record => this.normalizeRecord(record, data));
        
        allArticles = [...allArticles, ...normalizedRecords];
        
        if (allArticles.length >= totalCount || allArticles.length >= limit) {
          break;
        }
        
        start += toFetch;
      }
      
      return {
        count: totalCount,
        articles: allArticles
      };
      
    } catch (error) {
      console.error("Springer API Error:", error);
      throw error;
    }
  }

  /**
   * Normalizes a Springer record to the common data model.
   */
  static normalizeRecord(record, fullResponse = {}) {
    // Springer often provides identifiers like 'doi:10.1007/...'
    let doi = record.doi || '';
    if (!doi && record.identifier && record.identifier.startsWith('doi:')) {
      doi = record.identifier.substring(4);
    }
    
    return {
      source: 'SPRINGER',
      external_id: doi, // Use DOI as the external identifier for Springer
      doi: doi,
      title: record.title || 'Sin Título',
      abstract: record.abstract || 'Abstract no disponible.',
      url: record.url ? record.url[0]?.value : '',
      publication_date: record.publicationDate || '',
      year: record.publicationDate ? record.publicationDate.substring(0, 4) : 'Unknown',
      journal: record.publicationName || record.journalTitle || '',
      authors: record.creators ? record.creators.map(c => c.creator) : [],
      raw_json: record // Save raw JSON for snapshot/database
    };
  }
}

export default SpringerService;
