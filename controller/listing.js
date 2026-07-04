const { query } = require("express");
const listings = require("../models/listing");
const mbxGeocoding = require("@mapbox/mapbox-sdk/services/geocoding");
const mapToken = process.env.MAP_TOKEN;
const geocodingClient = mbxGeocoding({ accessToken: mapToken });

module.exports.index = async (req, res) => {
    const allListing = await listings.find({});
    res.render("../views/listings/index.ejs", { allListing });
}

module.exports.rendernewForm = async (req, res) => {
    res.render("listings/form.ejs");
};

module.exports.showsallListings = async (req, res) => {
    let { id } = req.params;
    const listing = await listings.findById(id).populate({ path: "reviews", populate: { path: "author" } }).populate("owner");
    console.log("listing geometry:", listing.geometry);
    if (!listing) {
        req.flash("error", "Listing you are requested for does not exist");
        return res.render("/listings");
    }
    res.render("../views/listings/show.ejs", { listing });
}

module.exports.rendereditForm = async (req, res) => {
    let { id } = req.params;
    const listing = await listings.findById(id);
    if (!listing) {
        req.flash("error", "Listing you are requested for does not exist");
        return res.render("/listings");
    }
    let originalImageUrl = listing.image.url;
    originalImageUrl = originalImageUrl.replace("/upload", "/upload/w_150,h_100");
    console.log("Original image URL:", listing.image.url);
    console.log("Modified preview URL:", originalImageUrl);
    res.render("../views/listings/edit.ejs", { listing, originalImageUrl });
}

module.exports.updateListing = async (req, res) => {
    let { id } = req.params;
    let listing = await listings.findById(id);

    Object.assign(listing, req.body.listing);

    // Re-geocode if location changed
    let response = await geocodingClient
        .forwardGeocode({
            query: req.body.listing.location,
            limit: 1,
        })
        .send();
    listing.geometry = response.body.features[0].geometry;

    if (typeof req.file !== "undefined") {
        let url = req.file.path;
        let filename = req.file.filename;
        listing.image = { url, filename };
    }

    await listing.save();

    req.flash("success", "listing update successfully");
    res.redirect("/listings");
}

module.exports.destroyListing = async (req, res) => {
    let { id } = req.params;
    await listings.findByIdAndDelete(id, { ...req.body.listing });
    req.flash("success", "listing Deleted");
    res.redirect("/listings");
}

module.exports.createListing = async (req, res, next) => {
  try {
    let response = await geocodingClient
      .forwardGeocode({
        query: req.body.listing.location,
        limit: 1,
      })
      .send();
      console.log("Geocode query:", req.body.listing.location);
      console.log("Geocode result:", JSON.stringify(response.body.features[0], null, 2));

    let url = req.file.path;
    let filename = req.file.filename;

    let Listing = new listings(req.body.listing);
    Listing.owner = req.user._id;
    Listing.image = { url, filename };
    Listing.geometry = response.body.features[0].geometry;

    let savedListing = await Listing.save();
    req.flash("success", "new listing successfully created");
    res.redirect("/listings");
  } catch (err) {
    console.log("GEOCODE ERROR:", err);
    req.flash("error", "Location error");
    return res.redirect("/listings/new");
  }
}