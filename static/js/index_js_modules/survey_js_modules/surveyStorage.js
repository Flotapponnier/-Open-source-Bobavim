// Survey data storage management - now using real database API

// Cache for survey data
let surveyCache = null;
let userVotesCache = null;
let currentSurveyId = null;

// Get current active survey ID
async function getCurrentSurveyId() {
  if (currentSurveyId) {
    return currentSurveyId;
  }
  
  try {
    const response = await fetch('/api/surveys/');
    const data = await response.json();
    
    if (data.success && data.surveys && data.surveys.length > 0) {
      currentSurveyId = data.surveys[0].id;
      return currentSurveyId;
    }
  } catch (error) {
    logger.error('Error fetching current survey ID:', error);
  }
  
  return null;
}

// Clear all caches (useful when survey changes)
export function clearAllCaches() {
  surveyCache = null;
  userVotesCache = null;
  currentSurveyId = null;
}

export async function getUserSurveyData() {
  try {
    if (userVotesCache) {
      return userVotesCache;
    }
    
    const surveyId = await getCurrentSurveyId();
    if (!surveyId) {
      return {
        userRating: null,
        hasVoted: false,
        voteTimestamp: null
      };
    }
    
    const response = await fetch(`/api/surveys/${surveyId}/votes`);
    const data = await response.json();
    
    if (data.success && data.votes) {
      // Convert votes data to expected format
      const hasVoted = Object.keys(data.votes).length > 0;
      const userRating = hasVoted ? parseInt(Object.values(data.votes)[0]) : null;
      
      userVotesCache = {
        userRating,
        hasVoted,
        voteTimestamp: hasVoted ? Date.now() : null
      };
      
      return userVotesCache;
    }
  } catch (error) {
    logger.error('Error loading survey data:', error);
  }
  
  return {
    userRating: null,
    hasVoted: false,
    voteTimestamp: null
  };
}

export async function getCommunityData() {
  try {
    if (surveyCache) {
      return surveyCache;
    }
    
    const surveyId = await getCurrentSurveyId();
    if (!surveyId) {
      return {
        totalVotes: 0,
        totalScore: 0,
        average: 0
      };
    }
    
    const response = await fetch(`/api/surveys/${surveyId}/results`);
    const data = await response.json();
    
    if (data.success && data.results) {
      // Get results for the first (and only) question
      const questionResults = Object.values(data.results)[0];
      
      if (questionResults && questionResults.type === 'rating') {
        surveyCache = {
          totalVotes: questionResults.total_votes,
          totalScore: questionResults.total_score,
          average: questionResults.average
        };
        
        return surveyCache;
      }
    }
  } catch (error) {
    logger.error('Error loading community data:', error);
  }
  
  return {
    totalVotes: 0,
    totalScore: 0,
    average: 0
  };
}

export async function submitUserRating(rating) {
  try {
    // Get survey questions first
    const surveysResponse = await fetch('/api/surveys/');
    const surveysData = await surveysResponse.json();
    
    if (!surveysData.success || !surveysData.surveys.length) {
      throw new Error('No active surveys found');
    }
    
    const survey = surveysData.surveys[0];
    const question = survey.questions[0]; // First question is the rating
    
    // Submit the vote
    const response = await fetch('/api/surveys/vote', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        survey_id: survey.id,
        question_id: question.id,
        answer: rating.toString(),
      }),
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to submit vote');
    }
    
    // Clear cache to force refresh
    userVotesCache = null;
    surveyCache = null;
    
    // Return updated data
    const userData = await getUserSurveyData();
    const communityData = await getCommunityData();
    
    return { userData, communityData };
  } catch (error) {
    logger.error('Error submitting rating:', error);
    throw error;
  }
}

export async function clearUserVote() {
  try {
    // Get survey questions first
    const surveysResponse = await fetch('/api/surveys/');
    const surveysData = await surveysResponse.json();
    
    if (!surveysData.success || !surveysData.surveys.length) {
      throw new Error('No active surveys found');
    }
    
    const survey = surveysData.surveys[0];
    const question = survey.questions[0]; // First question is the rating
    
    // Delete the vote
    const response = await fetch(`/api/surveys/vote/${question.id}`, {
      method: 'DELETE',
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to delete vote');
    }
    
    // Clear cache to force refresh
    userVotesCache = null;
    surveyCache = null;
    
    // Return updated data
    const userData = await getUserSurveyData();
    const communityData = await getCommunityData();
    
    return { userData, communityData };
  } catch (error) {
    logger.error('Error clearing vote:', error);
    throw error;
  }
}

export async function submitUserChoice(choice) {
  try {
    // Get survey questions first
    const surveysResponse = await fetch('/api/surveys/');
    const surveysData = await surveysResponse.json();
    
    if (!surveysData.success || !surveysData.surveys.length) {
      throw new Error('No active surveys found');
    }
    
    const survey = surveysData.surveys[0];
    const question = survey.questions[0]; // First question
    
    // Submit the vote
    const response = await fetch('/api/surveys/vote', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        survey_id: survey.id,
        question_id: question.id,
        answer: choice,
      }),
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to submit vote');
    }
    
    // Clear cache to force refresh
    userVotesCache = null;
    surveyCache = null;
    
    // Return updated data
    const userData = await getUserSurveyData();
    const communityData = await getCommunityData();
    
    return { userData, communityData };
  } catch (error) {
    logger.error('Error submitting choice:', error);
    throw error;
  }
}

export async function submitUserText(text) {
  try {
    // Get survey questions first
    const surveysResponse = await fetch('/api/surveys/');
    const surveysData = await surveysResponse.json();
    
    if (!surveysData.success || !surveysData.surveys.length) {
      throw new Error('No active surveys found');
    }
    
    const survey = surveysData.surveys[0];
    const question = survey.questions[0]; // First question
    
    // Submit the vote
    const response = await fetch('/api/surveys/vote', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        survey_id: survey.id,
        question_id: question.id,
        answer: text,
      }),
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to submit vote');
    }
    
    // Clear cache to force refresh
    userVotesCache = null;
    surveyCache = null;
    
    // Return updated data
    const userData = await getUserSurveyData();
    const communityData = await getCommunityData();
    
    return { userData, communityData };
  } catch (error) {
    logger.error('Error submitting text:', error);
    throw error;
  }
}