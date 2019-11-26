import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import GoogleMapReact from 'google-map-react';
import {
  Grid,
  Box,
  Flex,
  Heading,
  Input,
  Tooltip,
  Icon,
  Text,
  RadioGroup,
  Radio,
  CloseButton,
  Button,
  PseudoBox,
} from '@chakra-ui/core';

import { MdPlace, MdHome } from 'react-icons/md';

// import Nav from '../components/nav';
import Autocomplete from '../components/Autocomplete';

function useStoredState(initialState, key) {
  const [state, setState] = useState(initialState);

  useEffect(() => {
    const storedState = localStorage.getItem(key);
    try {
      if (storedState) {
        setState(JSON.parse(storedState));
      }
    } catch (error) {
      console.warn(`Could not parse content for key: ${key}`);
      console.error(error);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(state));
  }, [state]);

  if (!key) {
    console.warn(
      'You must provide a key as the second parameter to store and initialize state'
    );
  }

  return [state, setState];
}

const center = {
  lat: 33.09,
  lng: -96.7,
};

const zoom = 11;

let directionsService;
let directionsRenderer;

const MapContainer = () => {
  const [activeAddress, setActiveAddress] = useState(null);
  const [homesDisabled, setHomesDisabled] = useState(false);
  const [googleMaps, setGoogleMaps] = useState(null);
  const [keyLocations, setKeyLocations] = useStoredState([], 'key-locations');
  const [homeList, setHomeList] = useStoredState([], 'how-far-is-it:homes');
  const [activeLocation, setActiveLocation] = useState(null);
  const lastLocationRef = useRef();

  function addHome(newAddress) {
    setHomeList([...homeList, newAddress]);
  }

  function addKeyLocation(newLocation) {
    setKeyLocations([...keyLocations, newLocation]);
    if (lastLocationRef && lastLocationRef.current) {
      // timeout hack to let ref update before trying to focus it
      setTimeout(() => {
        lastLocationRef.current.focus();
      }, 1);
    }
  }

  function removeKeyLocation(locationName) {
    const updatedLocations = [...keyLocations].filter(
      location => location.name !== locationName
    );
    setKeyLocations(updatedLocations);
  }

  function clearAutocomplete() {
    const autocompleteInput = document.querySelector('#autocomplete-input');
    if (autocompleteInput) {
      autocompleteInput.value = '';
    }
  }

  useEffect(() => {
    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer();

    if (activeAddress !== null) {
      const getAllRoutes = async () => {
        // prevent homes from being changed while loading
        setHomesDisabled(true);
        const updatedLocationPromises = keyLocations.map(async location => {
          const request = {
            origin: activeAddress,
            destination: { lat: location.lat, lng: location.lng },
            travelMode: 'DRIVING',
            // drivingOptions: {
            //   departureTime: new Date(/* now, or future date */),
            //   trafficModel: 'pessimistic'
            // },
          };

          const getRoute = async () => {
            return new Promise((resolve, reject) => {
              directionsService.route(request, (result, status) => {
                console.log({ result });
                resolve(result);
              });
            });
          };

          const routeResult = await getRoute();

          return { ...location, directions: routeResult };
        });

        const results = await Promise.all(updatedLocationPromises);

        setKeyLocations(results);

        // re-enable changing address after
        setHomesDisabled(false);
      };

      getAllRoutes();
    }
  }, [activeAddress, keyLocations.length]);

  useEffect(() => {
    if (homeList.length > 0 && activeAddress === null) {
      setActiveAddress(homeList[0].address);
    }
  }, [homeList]);

  // useEffect(() => {
  //   const map = document.querySelector('#google-map-container').children[0]
  //     .children[0];
  //   directionsRenderer.setMap(map);
  // }, [googleMaps]);

  const activeHome = homeList.find(home => home.address === activeAddress);

  return (
    <Grid templateColumns="6fr 3fr" height="100vh">
      <div style={{ height: '100vh', width: '100%' }} id="google-map-container">
        <GoogleMapReact
          // bootstrapURLKeys={{ key: '' }}
          defaultCenter={center}
          defaultZoom={zoom}
          onGoogleApiLoaded={({ map, maps }) => {
            setGoogleMaps({ map, maps });
            directionsRenderer.setMap(map);
          }}
        >
          {keyLocations.map(location => (
            <Tooltip
              key={location.name}
              lat={location.lat}
              lng={location.lng}
              hasArrow
              placement="top"
              label={location.name}
            >
              <Flex>
                <Icon as={MdPlace} size="24px" marginLeft="-18px" />
              </Flex>
            </Tooltip>
          ))}
          {activeHome !== undefined && (
            <Icon
              as={MdHome}
              lat={activeHome.location.lat}
              lng={activeHome.location.lng}
              color="blue.500"
              size="24px"
              marginLeft="-12px"
            />
          )}
        </GoogleMapReact>
      </div>
      <Box p="3" overflow="auto">
        {googleMaps !== null && (
          <>
            <Box paddingBottom="2" mb="10px">
              <Autocomplete
                placeholder="Enter Location"
                style={{ width: '100%' }}
                onPlaceSelected={place => {
                  setActiveLocation({
                    address: place.formatted_address,
                    location: {
                      lng: place.geometry.location.lng(),
                      lat: place.geometry.location.lat(),
                    },
                  });
                }}
                types={['address']}
                // input={<Input placeholder="Address" />}
              />
              <Flex>
                <Button
                  width="50%"
                  borderRadius="0"
                  borderBottomLeftRadius="4px"
                  onClick={() => {
                    setActiveAddress(activeLocation.address);
                    addHome(activeLocation);
                    setActiveLocation(null);
                    clearAutocomplete();
                  }}
                  disabled={!activeLocation}
                >
                  Add Home
                </Button>
                <Button
                  width="50%"
                  borderRadius="0"
                  borderBottomRightRadius="4px"
                  onClick={() => {
                    console.log(activeLocation);
                    const { lat, lng } = activeLocation.location;
                    addKeyLocation({ lat, lng, name: '' });
                    setActiveLocation(null);
                  }}
                  disabled={!activeLocation}
                >
                  Add Landmark
                </Button>
              </Flex>
              <Box mt="10px">
                <RadioGroup
                  key={activeAddress}
                  onChange={e => {
                    setActiveAddress(e.target.value);
                  }}
                  value={activeAddress}
                >
                  {homeList.map(homeItem => (
                    <Radio
                      key={homeItem.address}
                      value={homeItem.address}
                      isDisabled={homesDisabled}
                    >
                      {homeItem.address}
                    </Radio>
                  ))}
                </RadioGroup>
              </Box>
            </Box>
            {keyLocations.length > 0 && (
              <Heading size="md" mb="10px">
                Landmarks
              </Heading>
            )}
            {keyLocations.map((location, index) => {
              // function handleFocus() {
              //   const renderer = googleMaps.maps.DirectionsRenderer();
              //   renderer.setMap(googleMaps.map);
              //   console.log(renderer);
              //   renderer.setDirections(location.directions);
              // }
              return (
                <PseudoBox
                  key={index}
                  rounded="lg"
                  borderWidth="1px"
                  p="6"
                  mb="10px"
                  position="relative"
                  // onMouseOver={handleFocus}
                  // onFocus={handleFocus}
                >
                  <CloseButton
                    position="absolute"
                    top="5px"
                    right="5px"
                    onClick={() => removeKeyLocation(location.name)}
                  />
                  <Input
                    ref={lastLocationRef}
                    value={location.name}
                    variant="unstyled"
                    onChange={e => {
                      const updatedLocations = [...keyLocations];
                      updatedLocations[index].name = e.target.value;
                      setKeyLocations(updatedLocations);
                    }}
                    placeholder="Location Name"
                    fontWeight="600"
                    height="30px"
                  />
                  {location.directions && location.directions.routes && (
                    <>
                      <Text>
                        {location.directions.routes[0].legs[0].duration.text}
                      </Text>
                      <Text>
                        {location.directions.routes[0].legs[0].distance.text}
                      </Text>
                    </>
                  )}
                </PseudoBox>
              );
            })}
          </>
        )}
      </Box>
    </Grid>
  );
};

const Home = () => {
  return (
    <div>
      <Head>
        <title>Home</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <MapContainer />
    </div>
  );
};

export default Home;
