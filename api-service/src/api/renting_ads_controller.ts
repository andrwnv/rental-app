import express from 'express';
import { validationResult } from 'express-validator';

import { Op } from 'sequelize';
import Connection from '../models/db_models';
import Client from '../models/types/client_type';

const filter = async (dates: Date[], rating: number[], price: number[]) => {
    const beginDate = new Date(dates[0]);
    const endDate = new Date(dates[1]);

    let objects = await Connection.models.object.findAll({
        order: [
            ['id', 'ASC'],
        ],
        where: {
            [Op.and]: [
                {
                    rating: {
                        [Op.between]: rating
                    },
                },
                {
                    price: {
                        [Op.between]: price
                    }
                },
            ]
        }
    });

    let filterRes = [];
    for (let item of objects) {
        const tryFindBooking = await Connection.models.bookedObject.count({
            where: {
                FK_object: item.get('id') as number,
                [Op.or]: [
                    {
                        beginDate: {
                            [Op.between]: [beginDate, endDate]
                        }
                    },
                    {
                        endDate: {
                            [Op.between]: [beginDate, endDate]
                        }
                    },
                ]
            }
        });

        const tryFindRent = await Connection.models.rentedObject.count({
            where: {
                FK_object: item.get('id') as number,
                [Op.or]: [
                    {
                        beginDate: {
                            [Op.between]: [beginDate, endDate]
                        }
                    },
                    {
                        endDate: {
                            [Op.between]: [beginDate, endDate]
                        }
                    }
                ]
            }
        });

        if ( tryFindBooking === 0 && tryFindRent === 0 ) {
            filterRes.push(item);
        }
    }

    return filterRes;
};


class RentingAdsController {
    async index(req: express.Request, res: express.Response) {
        try {
            const count = req.query.count as string;
            const padding = (req.query.padding || 0) as string;

            if ( !count ) {
                const rentedObjects = await Connection.models.object.findAll({
                    order: [
                        ['id', 'DESC'],
                    ],
                    offset: parseInt(padding)
                });

                res.status(400).json({
                    status: 'Error',
                    data: rentedObjects
                });

                return;
            }

            const rentedObjects = await Connection.models.object.findAll({
                order: [
                    ['id', 'ASC'],
                ],
                limit: parseInt(count),
                offset: parseInt(padding)
            });

            res.status(200).json({
                status: 'Success',
                data: rentedObjects
            });
        } catch(err) {
            res.status(500).json({
                status: 'Error',
                data: err
            });
        }
    }

    async newAd(req: express.Request, res: express.Response) {
        try {
            const validationErrors = validationResult(req);

            if ( !validationErrors.isEmpty() ) {
                res.status(400).json({
                    status: 'Error',
                    data: validationErrors.array()
                });

                return;
            }

            const landlord = req.user as Client;
            const currentDate = new Date();

            const country = await Connection.models.country.findOne({ where: { name: req.body.country } });
            const street = await Connection.models.street.findOne({ where: { name: req.body.street } });
            const localityType = await Connection.models.localityType.findOne({ where: { name: req.body.localityType } });
            const locality = await Connection.models.locality.findOne({ where: { name: req.body.locality } });
            const objectType = await Connection.models.objectType.findOne({ where: { typeName: req.body.objectType } });

            if ( !country || !street || !localityType || !locality || !objectType ) {
                res.status(400).json({
                    status: 'Error',
                    data: 'Cant find: country || street || localityType || locality || objectType'
                });

                return;
            }

            const adData = {
                FK_landLord: landlord.id,
                title: req.body.title,
                description: req.body?.description,
                price: req.body.price,
                rating: 0,
                createDate: currentDate.toISOString(),
                updateDate: currentDate.toISOString(),
                mediaLinks: { urls: [] },
                createMediaDate: currentDate.toISOString(),
                updateMediaDate: currentDate.toISOString(),
                FK_country: country.get('id'),
                FK_locality: locality.get('id'),
                FK_localityType: localityType.get('id'),
                FK_street: street.get('id'),
                FK_objectType: objectType.get('id'),
                houseNumber: req.body.houseNumber,
                comfortProps: req.body.comfortProps,
                additionalComfortProps: req.body.addComfortProps,
                buildingTowerNumber: req.body.blockNumber == '' ? null : req.body.blockNumber,
                apartmentNumber: req.body.apartNumber == '' ? null : req.body.apartNumber,
            };

            const _newAd = await Connection.models.object.create(adData);

            res.status(200).json({
                status: 'Success',
                data: {
                    item_id: _newAd.get('id'),
                    landlord: {
                        id: landlord.id,
                        fullName: `${landlord.firstName} ${landlord.lastName}`,
                        clientType: landlord.clientType
                    },
                    title: req.body.title,
                    description: req.body?.description,
                    price: req.body.price,
                    rating: 0,
                    createDate: currentDate.toISOString(),
                    updateDate: currentDate.toISOString(),
                    mediaLinks: {},
                    createMediaDate: currentDate.toISOString(),
                    updateMediaDate: currentDate.toISOString(),
                    landData: {
                        landType: {
                            id: objectType.get('id'),
                            name: objectType.get('typeName'),
                        },
                        country: {
                            id: country.get('id'),
                            name: country.get('name'),
                        },
                        locality: {
                            id: locality.get('id'),
                            name: locality.get('name'),
                            localityType: {
                                id: localityType.get('id'),
                                name: localityType.get('name'),
                            }
                        },
                        street: {
                            id: street.get('id'),
                            name: street.get('name'),
                        },
                        houseNumber: req.body.houseNumber
                    },
                    additionalComfortProps: req.body.addComfortProps
                }
            });
        } catch(err) {
            res.status(500).json({
                status: 'Error',
                data: err
            });
        }
    }

    async show(req: express.Request, res: express.Response) {
        try {
            const objectId = req.params.id;

            const rentedObject = await Connection.models.object.findOne({
                where: {
                    id: objectId
                },
                include: [
                    {
                        model: Connection.models.objectType,
                        required: true,
                        attributes: ['typeName']
                    },
                    {
                        model: Connection.models.street,
                        required: true,
                        attributes: ['name']
                    },
                    {
                        model: Connection.models.country,
                        required: true,
                        attributes: ['name']
                    },
                    {
                        model: Connection.models.locality,
                        required: true,
                        attributes: ['name']
                    },
                    {
                        model: Connection.models.localityType,
                        required: true,
                        attributes: ['name']
                    },
                    {
                        model: Connection.models.clients,
                        required: true,
                        attributes: ['firstName', 'lastName', 'rating', 'photoLink', 'id']
                    },
                ],
                attributes: {
                    exclude: ['FK_landLord', 'FK_country', 'FK_locality', 'FK_localityType', 'FK_street', 'FK_objectType'],
                },
            });

            res.status(200).json({
                status: 'Success',
                data: rentedObject
            });
        } catch(err) {
            res.status(500).json({
                status: 'Error',
                data: err
            });
        }
    }

    async delete(req: express.Request, res: express.Response) {
        try {
            const landlord = req.user as Client;

            const object = await Connection.models.object.findOne({
                where: {
                    id: req.body.objectId
                }
            });

            if ( !object ) {
                res.status(404).json({
                    status: 'Error',
                    data: 'Cant find object with this objectId'
                });

                return;
            }

            if ( landlord.id === object.get('FK_landLord') ) {
                object.destroy().then();

                res.status(200).json({
                    status: 'Success',
                    data: 'Object deleted!'
                });
            }
            else {
                res.status(406).json({
                    status: 'Error',
                    data: 'Accept error!'
                });
            }
        } catch(err) {
            res.status(500).json({
                status: 'Error',
                data: err
            });
        }
    }

    async userAds(req: express.Request, res: express.Response) {
        try {
            const landlord = req.user as Client;

            const userAds = await Connection.models.object.findAll({
                where: {
                    FK_landLord: landlord.id
                }
            });

            res.status(200).json({
                status: 'Success',
                data: userAds
            });
        } catch(err) {
            res.status(500).json({
                status: 'Error',
                data: err
            });
        }
    }

    async filter(req: express.Request, res: express.Response) {
        try {
            const dates = JSON.parse(req.query.date as any);
            const rating = JSON.parse(req.query.rating as any);
            const price = JSON.parse(req.query.price as any);

            if ( dates.length < 2 || rating.length < 2 || price.length < 2 ) {
                res.status(400).json({
                    status: 'Error',
                    data: 'Incorrect request'
                });

                return;
            }

            res.status(200).json({
                status: 'Success',
                data: await filter(dates, rating, price)
            });
        } catch(err) {
            res.status(500).json({
                status: 'Error',
                data: err
            });
        }
    }
}

export const RentingAdsCtrl = new RentingAdsController();
