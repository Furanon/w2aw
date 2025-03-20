  return {
    default: {
      map: vi.fn(() => mockMap),
      tileLayer: vi.fn(() => mockTileLayer),
      marker: vi.fn(() => mockMarker),
      LayerGroup: vi.fn(() => mockLayerGroup),
      latLng: vi.fn((lat, lng) => ({ lat, lng })),
      divIcon: vi.fn(({ html }) => ({ html })),
    },
describe('MapView', () => {
  const mockPlaces = [
    { 
      id: '1', 
      name: 'Place 1', 
      location: { lat: 0, lng: 0 },
      rating: 4.8,
      types: ['restaurant', 'food']
    },
    { 
      id: '2', 
      name: 'Place 2', 
      location: { lat: 1, lng: 1 },
      rating: 3.2,
      types: ['cafe', 'drinks']
    },
    {
      id: '3',
      name: 'Place 3',
      location: { lat: 2, lng: 2 },
      rating: 2.5,
      types: ['store']
    }
  ];
    expect(L.marker).toHaveBeenCalledTimes(mockPlaces.length);
    expect(L.divIcon).toHaveBeenCalledTimes(mockPlaces.length);
  });

  test('creates markers with correct colors based on ratings', () => {
    render(
      <VisualizationProvider value={createMockContext()}>
        <MapView />
      </VisualizationProvider>
    );

    const L = require('leaflet').default;
    
    // Check each icon creation
    const divIconCalls = L.divIcon.mock.calls;
    
    // High rating (>= 4.5) should be green
    expect(divIconCalls[0][0].html).toContain('background-color: #00CC00');
    
    // Medium rating (>= 3.0) should be yellow/orange
    expect(divIconCalls[1][0].html).toContain('background-color: #CC8800');
    
    // Low rating (< 3.0) should be red
    expect(divIconCalls[2][0].html).toContain('background-color: #CC0000');
  });
    ]);
  });

  test('scales up selected marker', () => {
    const selectedPlace = mockPlaces[0];
    render(
      <VisualizationProvider value={createMockContext({ selectedPlace })}>
        <MapView />
      </VisualizationProvider>
    );

    const { marker } = require('leaflet');
    const mockDOMElement = marker.getElement();
    const mockStyleElement = mockDOMElement.querySelector();

    // Selected marker should be scaled up
    expect(mockStyleElement.style.transform).toBe('scale(1.5)');
    expect(mockStyleElement.style.zIndex).toBe('1000');
    
    // Check that popup was opened
    expect(marker.openPopup).toHaveBeenCalled();
  });

  test('creates correct popup content', () => {
    render(
      <VisualizationProvider value={createMockContext()}>
        <MapView />
      </VisualizationProvider>
    );

    const { marker } = require('leaflet');
    const bindPopupCalls = marker.bindPopup.mock.calls;
    
    // Check first marker's popup content
    const popupContent = bindPopupCalls[0][0];
    expect(popupContent).toContain(`<strong>${mockPlaces[0].name}</strong>`);
    expect(popupContent).toContain(`Rating: ${mockPlaces[0].rating}/5`);
    expect(popupContent).toContain(`Type: ${mockPlaces[0].types.join(', ')}`);
  });

  test('triggers selectPlace when marker is clicked', () => {
    render(
      <VisualizationProvider value={createMockContext()}>
        <MapView />
      </VisualizationProvider>
    );

    const { marker } = require('leaflet');
    
    // Simulate click on first marker
    marker._callbacks.click();
    
    // Check that dispatch was called with correct action
    expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({
      type: 'SELECT_PLACE',
      payload: mockPlaces[0]
    }));
  });
});
