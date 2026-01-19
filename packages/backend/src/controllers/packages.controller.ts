import { Request, Response } from 'express';
import * as packageRepo from '../repositories/package.repository';

export async function getAllPackages(req: Request, res: Response) {
  try {
    const includeArchived = req.query.archived === 'true';
    const packages = await packageRepo.getAllPackages(includeArchived);

    // Add tracking URLs
    const packagesWithUrls = packages.map(pkg => ({
      ...pkg,
      tracking_url: packageRepo.getTrackingUrl(pkg.carrier, pkg.tracking_number),
    }));

    res.json({ success: true, data: packagesWithUrls });
  } catch (error: any) {
    console.error('Error getting packages:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function getActivePackages(req: Request, res: Response) {
  try {
    const packages = await packageRepo.getActivePackages();

    const packagesWithUrls = packages.map(pkg => ({
      ...pkg,
      tracking_url: packageRepo.getTrackingUrl(pkg.carrier, pkg.tracking_number),
    }));

    res.json({ success: true, data: packagesWithUrls });
  } catch (error: any) {
    console.error('Error getting active packages:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function getArchivedPackages(req: Request, res: Response) {
  try {
    const packages = await packageRepo.getArchivedPackages();

    const packagesWithUrls = packages.map(pkg => ({
      ...pkg,
      tracking_url: packageRepo.getTrackingUrl(pkg.carrier, pkg.tracking_number),
    }));

    res.json({ success: true, data: packagesWithUrls });
  } catch (error: any) {
    console.error('Error getting archived packages:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function getPackageById(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const pkg = await packageRepo.getPackageById(id);

    if (!pkg) {
      return res.status(404).json({ success: false, message: 'Package not found' });
    }

    res.json({
      success: true,
      data: {
        ...pkg,
        tracking_url: packageRepo.getTrackingUrl(pkg.carrier, pkg.tracking_number),
      },
    });
  } catch (error: any) {
    console.error('Error getting package:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function createPackage(req: Request, res: Response) {
  try {
    const { name, tracking_number, carrier, status, order_date, expected_delivery, order_number, vendor, cost, notes, notify_on_delivery } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }

    const pkg = await packageRepo.createPackage({
      name,
      tracking_number,
      carrier,
      status,
      order_date,
      expected_delivery,
      order_number,
      vendor,
      cost,
      notes,
      notify_on_delivery,
    });

    res.status(201).json({
      success: true,
      data: {
        ...pkg,
        tracking_url: packageRepo.getTrackingUrl(pkg.carrier, pkg.tracking_number),
      },
    });
  } catch (error: any) {
    console.error('Error creating package:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function updatePackage(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const { name, tracking_number, carrier, status, order_date, expected_delivery, actual_delivery, order_number, vendor, cost, notes, notify_on_delivery, is_archived } = req.body;

    const pkg = await packageRepo.updatePackage(id, {
      name,
      tracking_number,
      carrier,
      status,
      order_date,
      expected_delivery,
      actual_delivery,
      order_number,
      vendor,
      cost,
      notes,
      notify_on_delivery,
      is_archived,
    });

    if (!pkg) {
      return res.status(404).json({ success: false, message: 'Package not found' });
    }

    res.json({
      success: true,
      data: {
        ...pkg,
        tracking_url: packageRepo.getTrackingUrl(pkg.carrier, pkg.tracking_number),
      },
    });
  } catch (error: any) {
    console.error('Error updating package:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function updateStatus(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required' });
    }

    const pkg = await packageRepo.updateStatus(id, status);

    if (!pkg) {
      return res.status(404).json({ success: false, message: 'Package not found' });
    }

    res.json({
      success: true,
      data: {
        ...pkg,
        tracking_url: packageRepo.getTrackingUrl(pkg.carrier, pkg.tracking_number),
      },
    });
  } catch (error: any) {
    console.error('Error updating package status:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function archivePackage(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const pkg = await packageRepo.archivePackage(id);

    if (!pkg) {
      return res.status(404).json({ success: false, message: 'Package not found' });
    }

    res.json({ success: true, data: pkg });
  } catch (error: any) {
    console.error('Error archiving package:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function deletePackage(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const deleted = await packageRepo.deletePackage(id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Package not found' });
    }

    res.json({ success: true, message: 'Package deleted' });
  } catch (error: any) {
    console.error('Error deleting package:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function getArrivingSoon(req: Request, res: Response) {
  try {
    const days = req.query.days ? parseInt(req.query.days as string) : 3;
    const packages = await packageRepo.getPackagesArrivingSoon(days);

    const packagesWithUrls = packages.map(pkg => ({
      ...pkg,
      tracking_url: packageRepo.getTrackingUrl(pkg.carrier, pkg.tracking_number),
    }));

    res.json({ success: true, data: packagesWithUrls });
  } catch (error: any) {
    console.error('Error getting arriving packages:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function getStats(req: Request, res: Response) {
  try {
    const stats = await packageRepo.getStats();
    res.json({ success: true, data: stats });
  } catch (error: any) {
    console.error('Error getting package stats:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function getCarriers(req: Request, res: Response) {
  res.json({ success: true, data: packageRepo.CARRIERS });
}

export async function getStatuses(req: Request, res: Response) {
  res.json({ success: true, data: packageRepo.STATUSES });
}
