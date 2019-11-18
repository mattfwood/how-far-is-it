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
} from '@chakra-ui/core';

import { FiMapPin, FiHome } from 'react-icons/fi';

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

const MapContainer = () => {
  const [activeAddress, setActiveAddress] = useState(null);
  const [keyLocations, setKeyLocations] = useStoredState([], 'key-locations');
  const [homeList, setHomeList] = useState([]);
  const [activeLocation, setActiveLocation] = useState(null);
  const lastLocationRef = useRef();
  const autocompleteRef = useRef();

  function addHome(newAddress) {
    setHomeList([...homeList, newAddress]);
  }

  function addKeyLocation(newLocation) {
    setKeyLocations([...keyLocations, newLocation]);
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

    if (activeAddress !== null) {
      const getAllRoutes = async () => {
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
                resolve(result);
              });
            });
          };

          const result = await getRoute();

          return { ...location, ...result };
        });

        const results = await Promise.all(updatedLocationPromises);

        setKeyLocations(results);
      };

      getAllRoutes();
    }
  }, [activeAddress]);

  const activeHome = homeList.find(home => home.address === activeAddress);

  return (
    <Grid templateColumns="6fr 3fr" height="100vh">
      <div style={{ height: '100vh', width: '100%' }}>
        <GoogleMapReact
          // bootstrapURLKeys={{ key: '' }}
          defaultCenter={center}
          defaultZoom={zoom}
        >
          {keyLocations.map((location, index) => (
            <Tooltip
              key={location.name}
              lat={location.lat}
              lng={location.lng}
              hasArrow
              placement="top"
              label={`${location.name}-${index}`}
            >
              <Flex>
                <Icon as={FiMapPin} size="24px" marginLeft="-12px" />
              </Flex>
            </Tooltip>
          ))}
          {activeHome !== undefined && (
            <Icon
              as={FiHome}
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
        <Box paddingBottom="2" mb="10px">
          <Autocomplete
            ref={autocompleteRef}
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
                const { lat, lng } = activeLocation;
                addKeyLocation({ lat, lng, name: 'New Location' });
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
                <Radio key={homeItem.address} value={homeItem.address}>
                  {homeItem.address}
                </Radio>
              ))}
            </RadioGroup>
          </Box>
        </Box>
        <Heading size="md" mb="10px">
          Landmarks
        </Heading>
        {keyLocations.map((location, index) => (
          <Box
            key={index}
            rounded="lg"
            borderWidth="1px"
            p="6"
            mb="10px"
            position="relative"
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
            />
            {/* <Editable
              defaultValue={location.name}
              onSubmit={value => {
                const updatedLocations = [...keyLocations];
                updatedLocations[index].name = value;
                setKeyLocations(updatedLocations);
              }}
            >

              <EditablePreview />
            </Editable> */}
            {/* <Heading size="md">{location.name}</Heading> */}
            {location.routes && (
              <>
                <Text>{location.routes[0].legs[0].duration.text}</Text>
                <Text>{location.routes[0].legs[0].distance.text}</Text>
              </>
            )}
          </Box>
        ))}
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
