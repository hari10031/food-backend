import Shop from "../models/shop.models.js";
import uploadOnCloudinary from "../utils/cloudinary.js";


export const createEditShop = async (req, res) => {
    try {
        const { name, city, state, address } = req.body;
        let image;
        if (req.file) {
            image = await uploadOnCloudinary(req.file.path);
        }

        let shop = await Shop.findOne({ owner: req.userId });

        if (shop) {
            // Update existing shop
            const updateFields = {
                name,
                city,
                state,
                address,
                owner: req.userId
            };
            if (image) {
                updateFields.image = image;
            }

            shop = await Shop.findByIdAndUpdate(
                shop._id,
                updateFields,
                { new: true }
            );
        } else {
            // Create new shop
            const createFields = {
                name,
                city,
                state,
                address,
                owner: req.userId
            };
            if (image) {
                createFields.image = image;
            }

            shop = await Shop.create(createFields);
        }

        await shop.populate("owner items");
        return res.status(200).json({ shop }); // Changed to 200 for update/create success handling
    } catch (error) {
        return res.status(500).json({ message: `Create shop error ${error}` });
    }
}

export const getMyShop = async (req, res) => {
    try {
        const shop = await Shop.findOne({ owner: req.userId }).populate("owner").populate(
            {
                path: "items",
                options: {
                    sort: {
                        updatedAt: -1
                    }
                }
            }
        )
        if (!shop) {
            return res.status(200).json(null)
        }

        return res.status(200).json(shop)
    } catch (error) {
        return res.status(500).json({ message: `Unable to get shop error ${error}` });

    }
}

export const getShopByCity = async (req, res) => {
    try {
        const city = req.params.city;
        console.log(city)

        const shops = await Shop.find({
            city: { $regex: new RegExp(`^${city}$`, "i") }
        }).populate("items")
        console.log(shops)
        if (!shops) {
            return res.status(400).json(
                {
                    message: "Shops not found"
                }
            )
        }
        return res.status(200).json(shops)
    } catch (error) {
        return res.status(500).json({ message: `Unable to get shops by city error ${error}` });

    }
}