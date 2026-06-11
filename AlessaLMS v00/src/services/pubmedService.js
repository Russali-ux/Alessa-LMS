const BASE_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';

/**
 * PubMed Service Module
 * Handles API calls to E-utils for searching and fetching article data.
 * Highly modular and encapsulated for reuse across projects.
 */
class PubMedService {
  /**
   * Search PubMed and return history context (WebEnv, QueryKey) and total count.
   * Uses best match (sort=relevance).
   * 
   * @param {string} query PICO search term
   * @param {number} retmax Max results
   * @returns {object} { count, queryKey, webEnv, idList }
   */
  static async searchArticles(query, retmax = 20) {
    // encodeURIComponent is critical for handling spaces and special chars in the query
    const url = `${BASE_URL}/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&sort=relevance&retmax=${retmax}&usehistory=y&retmode=json`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const data = await response.json();
      const result = data.esearchresult || {};
      
      return {
        count: parseInt(result.count || 0, 10),
        queryKey: result.querykey,
        webEnv: result.webenv,
        idList: result.idlist || []
      };
    } catch (error) {
      console.error("PubMed ESearch Error:", error);
      throw error;
    }
  }

  /**
   * Fetch full article metadata and abstract via EFetch (XML mode).
   * 
   * @param {string} queryKey 
   * @param {string} webEnv 
   * @param {number} retmax 
   * @returns {Array} Array of parsed articles
   */
  static async fetchArticleDetails(queryKey, webEnv, retmax = 20) {
    const url = `${BASE_URL}/efetch.fcgi?db=pubmed&query_key=${queryKey}&WebEnv=${webEnv}&retmax=${retmax}&retmode=xml`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const xmlText = await response.text();
      return this.parsePubMedXML(xmlText);
    } catch (error) {
      console.error("PubMed EFetch Error:", error);
      throw error;
    }
  }

  /**
   * Internal XML Parser to extract structured data from PubMedArticleSet.
   * 
   * @param {string} xmlText 
   * @returns {Array} List of article objects
   */
  static parsePubMedXML(xmlText) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");
    const articles = Array.from(xmlDoc.getElementsByTagName("PubmedArticle"));
    
    return articles.map(article => {
      // 1. Extract PMID
      const pmidNode = article.querySelector("MedlineCitation > PMID");
      const pmid = pmidNode ? pmidNode.textContent : "";
      const id = pmid ? `PMID:${pmid}` : "Unknown ID";
      
      // DOI
      const doiNode = article.querySelector('ArticleIdList > ArticleId[IdType="doi"]');
      const doi = doiNode ? doiNode.textContent : "";

      // Journal
      const journalNode = article.querySelector("Journal > Title");
      const journal = journalNode ? journalNode.textContent : "";

      // URL
      const url = pmid ? `https://pubmed.ncbi.nlm.nih.gov/${pmid}/` : "";

      // Authors
      const authorNodes = article.querySelectorAll("AuthorList > Author");
      const authors = Array.from(authorNodes).map(node => {
        const lastName = node.querySelector("LastName")?.textContent || "";
        const initials = node.querySelector("Initials")?.textContent || "";
        return `${lastName} ${initials}`.trim();
      }).filter(a => a);
      
      // 2. Extract Title
      const titleNode = article.querySelector("ArticleTitle");
      const title = titleNode ? titleNode.textContent : "Sin Título";
      
      // 3. Extract Year (from PubDate Year, or fallback to MedlineDate)
      const yearNode = article.querySelector("Journal > JournalIssue > PubDate > Year");
      const medlineDateNode = article.querySelector("Journal > JournalIssue > PubDate > MedlineDate");
      let year = "Unknown";
      if (yearNode) {
        year = yearNode.textContent;
      } else if (medlineDateNode) {
        year = medlineDateNode.textContent.substring(0, 4); // Usually "YYYY Mon-Mon"
      }
      
      // 4. Extract Abstract
      // Note: Some abstracts are structured with multiple <AbstractText Label="METHODS"> tags.
      const abstractNodes = article.querySelectorAll("Abstract > AbstractText");
      let abstract = "";
      if (abstractNodes.length > 0) {
        abstract = Array.from(abstractNodes)
          .map(node => {
            const label = node.getAttribute("Label");
            // If it has a structural label (like BACKGROUND), append it for better LLM context
            return label ? `${label}: ${node.textContent}` : node.textContent;
          })
          .join("\n\n");
      } else {
        abstract = "Abstract no disponible.";
      }
      
      return { 
        id, // legacy frontend prop
        source: 'PUBMED',
        external_id: pmid,
        doi: doi,
        title, 
        year, 
        publication_date: year,
        journal,
        abstract,
        url,
        authors,
        raw_json: { xmlSnippet: article.innerHTML }, // we don't have true JSON, so store XML inner HTML or basic object
        triaje: false,
        inclusion: "" 
      };
    });
  }

  /**
   * High-level wrapper for executing the complete PubMed search workflow.
   * 
   * @param {string} query Search text
   * @param {number} retmax Number of items to retrieve (default: 20)
   * @returns {object} { count: number, articles: array }
   */
  static async executeFullSearch(query, retmax = 20) {
    // 1. Search for IDs and History tokens
    const searchData = await this.searchArticles(query, retmax);
    
    // 2. If no results, return empty
    if (searchData.count === 0 || searchData.idList.length === 0) {
      return { count: 0, articles: [] };
    }
    
    // 3. Fetch details using the History tokens
    const articles = await this.fetchArticleDetails(searchData.queryKey, searchData.webEnv, retmax);
    
    return { 
      count: searchData.count, 
      articles 
    };
  }
}

export default PubMedService;
