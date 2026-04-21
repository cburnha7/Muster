import { Router } from 'express';

const router = Router();

const GOOGLE_API_KEY =
  process.env.GOOGLE_PLACES_API_KEY ||
  process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ||
  '';

// GET /api/places/autocomplete?input=...
router.get('/autocomplete', async (req, res) => {
  try {
    const { input } = req.query;
    if (!input || typeof input !== 'string' || input.length < 2) {
      return res.json({ predictions: [] });
    }

    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&types=address&language=en&key=${GOOGLE_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Places autocomplete proxy error:', error);
    res.json({ predictions: [] });
  }
});

// GET /api/places/details?place_id=...
router.get('/details', async (req, res) => {
  try {
    const { place_id } = req.query;
    if (!place_id || typeof place_id !== 'string') {
      return res.status(400).json({ error: 'place_id required' });
    }

    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(place_id)}&fields=address_components,geometry&key=${GOOGLE_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Places details proxy error:', error);
    res.status(500).json({ error: 'Failed to fetch place details' });
  }
});

export default router;
