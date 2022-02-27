import express from 'express';
import methodOverride from 'method-override';
import moment from 'moment';
import cookieParser from 'cookie-parser';
import {
  edit, read, write, remove,
} from './dataFileStorage.js';

const app = express();
const PORT = process.argv[2];

app.set('view engine', 'ejs');
// to allow use of static
app.use(express.static('public'));

// Override POST requests with query param ?_method=PUT to be PUT requests
app.use(methodOverride('_method'));
// to parse cookies into dictionary with key-pairs
app.use(cookieParser());

// Configure Express to parse request body data into request.body
app.use(express.urlencoded({ extended: false }));

const generateDate = (string) => {
  const date = moment(string).format('DD MMM YYYY hh:mm');
  const now = moment().format('DD MMM YYYY hh:mm');

  return [date, now];
};

const increaseVisit = (request, response) => {
  let visits = 0;
  // if there is a visit in the cookie list
  if (request.cookies.visits) {
    visits = Number(request.cookies.visits);
  }

  visits += 1;
  response.cookie('visits', visits);
};

const dynamicSort = (method, obj) => {
  const sortObj = [...obj];
  console.log(typeof method);
  // sort them in a descending order
  sortObj.sort((a, b) => {
    const nameA = a[method].toUpperCase();
    const nameB = b[method].toUpperCase();
    if (nameA < nameB) {
      return -1;
    }
    if (nameA > nameB) {
      return 1;
    }
    return 0;
  });
  return sortObj;
};

const favouritesCookieHandler = (request, response, index, command) => {
  let favourites = [];

  if (command === 'unfavourite') {
    const current = JSON.parse(request.cookies.favourites);
    favourites = current.filter((item) => Number(item) !== Number(index));
    response.cookie('favourites', JSON.stringify(favourites));
  } else if (!request.cookies.favourites) {
    favourites.push(index);
    response.cookie('favourites', JSON.stringify(favourites));
  } else {
    const oldFav = request.cookies.favourites;
    const Fav = JSON.parse(oldFav);
    favourites = [...Fav, index];
    favourites = favourites.filter((value, i) => favourites.indexOf(value) === i);
    response.cookie('favourites', JSON.stringify(favourites));
  }
};

const toggleFavourite = (item) => {
  if (typeof item.fav === 'undefined') {
    item.fav = 'favourite';
  } else if (item.fav === 'favourite') {
    item.fav = 'unfavourite';
  } else {
    item.fav = 'favourite';
  }
};

// Main Page with all the sightings
app.get('/', (request, response) => {
  increaseVisit(request, response);
  const { visits } = request.cookies;
  response.render('main-page', { visits });
});

app.get('/sighting/all', (request, response) => {
  read('data.json', (error, data) => {
    let ejsdata = data.sightings;
    const { sortBy } = request.query;

    if (sortBy) {
      ejsdata = dynamicSort(sortBy, ejsdata);
      response.render('main', { ejsdata });
    } else {
      response.render('main', { ejsdata });
    }
  });
});

// Render the form to input new sightings
app.get('/sighting', (request, response) => {
  response.render('sighting');
});

// Save new sighting data sent via POST request from our form
app.post('/sighting', (request, response) => {
  // Add new sighting data in request.body to sighting array in data.json.
  edit('data.json', (readErr, jsonContentObj) => {
    if (readErr) {
      console.log(readErr);
      return;
    }

    const [date, now] = generateDate(request.body.date_time);
    request.body.date_time = date;
    request.body.created_date_time = now;

    jsonContentObj.sightings.push(request.body);
    const { length } = jsonContentObj.sightings;
    response.redirect(`/sighting/${Number(length) - 1}`);
  }, (error, content) => {
    if (error) {
      console.log('write error');
    }
  });
});

app.get('/sighting/:index', (request, response) => {
  read('data.json', (error, data) => {
    const { index } = request.params;
    const { toggle } = request.query;

    if (typeof data.sightings[index] === 'undefined') {
      // if there is no index
      response.render('missing');
    } else {
      const sighting = { ...data.sightings[index] };
      sighting.index = index;
      if (toggle) {
        toggleFavourite(data.sightings[index]);
        write('data.json', data, (error) => {
          console.log(error);
        });
        favouritesCookieHandler(request, response, index, data.sightings[index].fav);
      }
      const ejsData = { sighting };
      response.render('sighting_submit', ejsData);
    }
  });
});

app.put('/sighting/:index', (request, response) => {
  const { index } = request.params;
  read('data.json', (err, data) => {
    // Replace the data in the object at the given index
    data.sightings[index] = request.body;

    const [date, now] = generateDate(request.body.date_time);
    data.sightings[index].date_time = date;
    data.sightings[index].created_date_time = now;

    write('data.json', data, (error) => {
      response.redirect(`/sighting/${index}`);
    });
  });
});

app.delete('/sighting/:index', (request, response) => {
  // Remove element from DB at given index
  const { index } = request.params;
  remove('data.json', 'sightings', index, (error, content) => {
    if (error) {
      console.log('error');
    }
  });

  response.redirect('/sighting/all/');
});

app.get('/sighting/:index/edit', (request, response) => {
  read('data.json', (err, jsonData) => {
    const { index } = request.params;
    const sighting = { ...jsonData.sightings[index] };
    sighting.index = index;
    const ejsData = { sighting };
    response.render('edit', ejsData);
  });
});

app.get('/shapes', (request, response) => {
  read('data.json', (err, data) => {
    const shapes = [];
    const sighting = [...data.sightings];
    // filters everything that has a shape
    const filteredShapes = sighting.filter((row) => row.shape);
    // creates a new array with shapes
    const shapesList = filteredShapes.map((row) => row.shape);

    shapesList.forEach((element) => {
      if (!shapes.includes(element)) {
        shapes.push(element);
      }
    });

    response.render('shapes', { shapes });
  });
});

app.get('/shapes/:name', (request, response) => {
  read('data.json', (err, data) => {
    const { name } = request.params;
    const sighting = [...data.sightings];
    // filters everything that has the given shape
    const ejsdata = sighting.filter((row) => row.shape === name);
    response.render('sighting-shapes', { ejsdata });
  });
});

app.listen(PORT);
