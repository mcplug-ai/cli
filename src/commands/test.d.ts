declare global{
  export type MCPLUG_Test = import("@mcplug/client/ai").InferTools<{
  research_paper_sexarch_tool: {
    IN: {
      /**
       * Research topic or keyword to search for
       */
      query: string;
      /**
       * Number of research papers to return (default: 5)
       */
      numResults?: number;
      /**
       * Maximum number of characters to return for each result's text content (Default: 3000)
       */
      maxCharacters?: number;
    };
    OUT: {
      results: {
        id: string;
        url: string;
        text: string;
        image?: string;
        score?: number;
        title: string;
        author: string;
        favicon?: string;
        publishedDate: string;
      }[];
      requestId: string;
      autopromptString: string;
      resolvedSearchType: string;
    };
  };
  web_search_tool: {
    IN: {
      /**
       * Search query
       */
      query: string;
      /**
       * Number of search results to return (default: 5)
       */
      numResults?: number;
    };
    OUT: {
      results: {
        id: string;
        url: string;
        text: string;
        image?: string;
        score?: number;
        title: string;
        author: string;
        favicon?: string;
        publishedDate: string;
      }[];
      requestId: string;
      autopromptString: string;
      resolvedSearchType: string;
    };
  };
  get_youtube_transcript: {
    IN: {
      /**
       * YouTube video URL or ID
       */
      url: string;
      /**
       * Language code for transcript (e.g., 'ko', 'en')
       */
      lang?: string;
    };
    OUT: {
      metadata: {
        /**
         * YouTube video ID
         */
        videoId: string;
        /**
         * Language code for transcript
         */
        language: string;
        /**
         * Number of characters in transcript
         */
        charCount: number;
        /**
         * Timestamp of transcript retrieval
         */
        timestamp: string;
      };
      /**
       * Transcript text
       */
      transcript: string;
    };
  };
}
>
}
export {}
