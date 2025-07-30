let cachedFavorites = null;

export function getFavoritesMaps() {
  const favorites = localStorage.getItem("boba-vim-favorites");
  return favorites ? JSON.parse(favorites) : [];
}

export async function addToFavorites(mapId) {
  const favorites = getFavoritesMaps();
  if (!favorites.includes(mapId)) {
    favorites.push(mapId);
    localStorage.setItem("boba-vim-favorites", JSON.stringify(favorites));

    await syncFavoriteToDatabase(mapId, "add");
  }
}

export async function removeFromFavorites(mapId) {
  const favorites = getFavoritesMaps();
  const index = favorites.indexOf(mapId);
  if (index > -1) {
    favorites.splice(index, 1);
    localStorage.setItem("boba-vim-favorites", JSON.stringify(favorites));

    await syncFavoriteToDatabase(mapId, "remove");
  }
}

export function isFavorite(mapId) {
  return getFavoritesMaps().includes(mapId);
}

async function syncFavoriteToDatabase(mapId, action) {
  try {
    const authResponse = await fetch("/api/auth/me", {
      credentials: 'include'
    });
    const authData = await authResponse.json();

    if (!authData.success || !authData.authenticated) {
      return;
    }

    if (action === "add") {
      await fetch("/api/user/favorites", {
        method: "POST",
        credentials: 'include',
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ map_id: mapId }),
      });
    } else if (action === "remove") {
      await fetch("/api/user/favorites", {
        method: "DELETE",
        credentials: 'include',
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ map_id: mapId }),
      });
    }
  } catch (error) {
    logger.error("Failed to sync favorite to database:", error);
  }
}

export async function loadFavoritesFromDatabase() {
  try {
    const authResponse = await fetch("/api/auth/me", {
      credentials: 'include'
    });
    const authData = await authResponse.json();

    if (!authData.success || !authData.authenticated) {
      return;
    }

    const favoritesResponse = await fetch("/api/user/favorites", {
      credentials: 'include'
    });
    const favoritesData = await favoritesResponse.json();

    if (favoritesData.success) {
      const localFavorites = getFavoritesMaps();
      const dbFavorites = favoritesData.favorites || [];

      const allFavorites = [...new Set([...localFavorites, ...dbFavorites])];
      localStorage.setItem("boba-vim-favorites", JSON.stringify(allFavorites));

      for (const mapId of localFavorites) {
        if (!dbFavorites.includes(mapId)) {
          await syncFavoriteToDatabase(mapId, "add");
        }
      }
    }
  } catch (error) {
    logger.error("Failed to load favorites from database:", error);
  }
}