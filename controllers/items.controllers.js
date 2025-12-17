
import uploadOnCloudinary from "../utils/cloudinary.js"
import Shop from "../models/shop.models.js"
import Item from "../models/items.models.js";
export const addItem = async (req, res) => {
    try {
        const { name, category, foodType, price } = req.body;
        let image;
        if (req.file) {
            image = await uploadOnCloudinary(req.file.path)
        }
        const shop = await Shop.findOne({ owner: req.userId })
        if (!shop) {
            return res.status(400).json({ message: "shop not found" })
        }
        const item = await Item.create(
            {
                name, image, shop: shop._id, category, price, foodType
            }
        )
        console.log("here")

        shop.items.push(item._id)
        await shop.save()
        await shop.populate("owner")
        await shop.populate(
            {
                path: "items",
                options: { sort: { updatedAt: -1 } }
            }
        )
        return res.status(201).json(shop)


    } catch (error) {
        return res.status(500).json({
            message: 'unable to add item error sed'
        })
    }
}

export const editItem = async (req, res) => {
    try {
        const itemId = req.params.itemId;
        const { name, category, foodType, price } = req.body;

        // Find existing item
        const existingItem = await Item.findById(itemId);
        if (!existingItem) {
            return res.status(404).json({ message: "Item not found" });
        }

        // Check ownership
        const shop = await Shop.findOne({ owner: req.userId });
        if (!shop || existingItem.shop.toString() !== shop._id.toString()) {
            return res.status(403).json({ message: "Unauthorized: Item does not belong to your shop" });
        }

        let image = existingItem.image;
        if (req.file) {
            image = await uploadOnCloudinary(req.file.path);
        }

        const item = await Item.findByIdAndUpdate(itemId, {
            name, category, foodType, price, image
        }, { new: true });

        // Update successful - return updated shop with items
        const updatedShop = await Shop.findById(shop._id).populate({
            path: "items",
            options: { sort: { updatedAt: -1 } }
        });

        return res.status(200).json(updatedShop);

    } catch (error) {
        return res.status(500).json({
            message: `Unable to edit item error: ${error.message}`
        });
    }
}

export const getItemById = async (req, res) => {
    try {
        const itemId = req.params.itemId;
        const item = await Item.findById(itemId);
        if (!item) {
            return res.status(404).json({ message: "Item not found" });
        }
        return res.status(200).json(item);

    } catch (error) {
        return res.status(500).json({
            message: "Get item error: " + error.message
        });
    }
}

export const deleteItem = async (req, res) => {
    try {
        const itemId = req.params.itemId;

        // Find existing item
        const existingItem = await Item.findById(itemId);
        if (!existingItem) {
            return res.status(404).json({ message: "Item not found" });
        }

        // Check ownership
        const shop = await Shop.findOne({ owner: req.userId });
        if (!shop || existingItem.shop.toString() !== shop._id.toString()) {
            return res.status(403).json({ message: "Unauthorized: Item does not belong to your shop" });
        }

        // Delete item
        await Item.findByIdAndDelete(itemId);

        // Remove from shop items array using pull (handles ObjectId correctly)
        shop.items.pull(itemId);
        await shop.save();

        await shop.populate({
            path: "items",
            options: {
                sort: {
                    updatedAt: -1
                }
            }
        });

        return res.status(200).json(shop);

    } catch (error) {
        return res.status(500).json({
            message: `Delete item error: ${error.message}`
        });
    }
}

export const getItemByCity = async (req, res) => {
    try {
        const { city } = req.params;
        if (!city) {
            return res.status(400).json({ message: "city is required" })

        }
        const shops = await Shop.find({
            city: { $regex: new RegExp(`^${city}$`, "i") }
        }).populate("items")
        if (!shops) {
            return res.status(400).json({ message: "shops not found" })

        }
        const shopIds = shops.map((shop) => shop._id)
        const items = await Item.find(
            {
                shop: {
                    $in: shopIds
                }
            }
        )
        // const items = await Item.find({})
        // console.log(`items:a ${items}`)
        return res.status(200).json(items)
    } catch (error) {
        return res.status(500).json(
            {
                message: `unable to getItemByCity  error ${error}`
            }
        )
    }
}

export const getItemsByShop = async (req, res) => {
    try {
        const { shopId } = req.params;
        const shop = await Shop.findById(shopId).populate("items")
        if (!shop) {
            return res.status(400).json("shop not found")
        }
        return res.status(200).json(
            {
                shop, items: shop.items
            }
        )

    } catch (error) {
        return res.status(500).json(
            {
                message: `getItem by shop ${error}`
            }
        )

    }
}

export const searchItems = async (req, res) => {
    try {
        const { query, city } = req.query;
        console.log("Search query:", query, "City:", city);
        if (!query || !city) {
            return res.status(400).json({ message: "query and city are required" })
        }
        const shops = await Shop.find({
            city: { $regex: new RegExp(`^${city}$`, "i") }
        }).populate("items")
        // console.log(shops)
        if (!shops) {
            return res.status(400).json(
                {
                    message: "Shops not found"
                }
            )
        }
        // const qRegex = new RegExp(query, "i")
        const shopIds = shops.map(s => s._id)
        const items = await Item.find(
            {
                shop: { $in: shopIds },
                $or: [
                    {
                        name: {
                            $regex: query,
                            $options: "i"
                        }
                    },
                    {
                        category: {
                            $regex: query,
                            $options: "i"
                        }
                    }
                ]

            }
        ).populate("shop", "name image")
        console.log("Search results:", items);

        return res.status(200).json(items)

    } catch (error) {
        return res.status(500).json(
            {
                message: `SearchItem  ${error}`
            }
        )

    }
}