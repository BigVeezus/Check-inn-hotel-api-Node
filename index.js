const express = require("express");
const app = express();
const port = 3000;
const path = require("path");
const methodOverride = require("method-override");
const mongoose = require("mongoose");
const ejsMate = require("ejs-mate");
const session = require("express-session");
const flash = require("connect-flash");
const { hotelSchema, reviewSchema } = require("./schemas");
const catchAsync = require("./utils/catchAsync");
const ExpressError = require("./utils/ExpressError");
const Hotel = require("./model/hotel");
const Review = require("./model/review");

mongoose.connect("mongodb://localhost:27017/check-inn", {
  useNewUrlParser: true,
  autoIndex: true,
  useUnifiedTopology: true,
  // useFindAndModify: false,
});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
  console.log("Database connected!");
});

app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(flash());

const sessionConfig = {
  secret: "bettersecret",
  resave: false,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    expires: Date.now() + 1000 * 60,
    maxAge: 1000 * 60,
  },
};
app.use(session(sessionConfig));
app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  next();
});

const validateHotel = (req, res, next) => {
  const { error } = hotelSchema.validate(req.body);
  if (error) {
    const msg = error.details.map((el) => el.message).join(",");
    throw new ExpressError(msg, 400);
  } else {
    next();
  }
};

const validateReview = (req, res, next) => {
  const { error } = reviewSchema.validate(req.body);
  if (error) {
    const msg = error.details.map((el) => el.message).join(",");
    throw new ExpressError(msg, 400);
  } else {
    next();
  }
};

app.get("/", (req, res) => {
  res.render("home");
});

app.get(
  "/hotels",
  catchAsync(async (req, res) => {
    const hotels = await Hotel.find({});
    res.render("hotels/index", { hotels });
  })
);

app.get("/hotels/new", (req, res) => {
  res.render("hotels/new");
});

app.post(
  "/hotels",
  validateHotel,
  catchAsync(async (req, res, next) => {
    // if (!req.body.hotel) throw new ExpressError("Invalid Hotel Data", 404);

    const newHotel = new Hotel(req.body.hotel);
    await newHotel.save();
    req.flash("success", "New hotel created!");
    res.redirect(`/hotels/${newHotel._id}`);
  })
);

app.get(
  "/hotels/:id",
  catchAsync(async (req, res) => {
    const { id } = req.params;
    const hotel = await Hotel.findById(id).populate("reviews");
    res.render("hotels/show", { hotel });
  })
);

app.get(
  "/hotels/:id/edit",
  catchAsync(async (req, res) => {
    const { id } = req.params;
    const hotel = await Hotel.findById(id);
    res.render("hotels/edit", { hotel });
  })
);

app.put(
  "/hotels/:id",
  validateHotel,
  catchAsync(async (req, res) => {
    const { id } = req.params;
    const hotel = await Hotel.findByIdAndUpdate(id, { ...req.body.hotel });
    req.flash("success", "Successfully updated Hotel");
    res.redirect(`/hotels/${hotel._id}`);
  })
);

app.delete(
  "/hotels/:id",
  catchAsync(async (req, res) => {
    const { id } = req.params;
    await Hotel.findByIdAndDelete(id);
    req.flash("success", "Deleted Hotel");
    res.redirect("/hotels");
  })
);

app.post(
  "/hotels/:id/reviews",
  validateReview,
  catchAsync(async (req, res) => {
    const hotel = await Hotel.findById(req.params.id);
    const review = new Review(req.body.review);
    hotel.reviews.push(review);
    await review.save();
    await hotel.save();
    req.flash("success", "Created review");
    res.redirect(`/hotels/${hotel._id}`);
  })
);

app.delete(
  "/hotels/:id/reviews/:reviewId",
  catchAsync(async (req, res) => {
    const { id, reviewId } = req.params;
    await Hotel.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });
    await Review.findByIdAndDelete(reviewId);
    req.flash("success", "Deleted review!");
    res.redirect(`/hotels/${id}`);
  })
);

app.all("*", (req, res, next) => {
  next(new ExpressError("Page Not Found!", 404));
});

app.use((err, req, res, next) => {
  const { statusCode = 500 } = err;
  if (!err.message) err.message = "Oh no, Something went wrong!";
  res.status(statusCode).render("error", { err });
});

app.listen(port, () => {
  console.log("PORT NOW LISTENING ON 3000 G!");
});
